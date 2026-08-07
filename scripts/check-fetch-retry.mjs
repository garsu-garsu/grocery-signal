/**
 * 시세 수집의 재시도 규칙을 확인해요.
 *
 * 이 코드는 매일 새벽 GitHub Actions 에서 사람 없이 돌아요. 잘못 짜면 그날 갱신이
 * 조용히 날아가거나(재시도 안 함) 워크플로가 영영 안 끝나요(무한 재시도).
 * 실제 API 를 부르지 않고 fetch 만 갈아끼워 확인합니다.
 *
 * 쓰기: node scripts/check-fetch-retry.mjs
 */
import assert from "node:assert/strict";

import { fetchRetrying } from "./fetch-prices.mjs";

/** 정해둔 응답을 차례로 돌려주는 가짜 fetch. 몇 번 불렸는지 세요. */
function stubFetch(steps) {
  let calls = 0;
  globalThis.fetch = async () => {
    const step = steps[calls++];
    if (step == null) throw new Error("예상보다 많이 호출됐어요");
    if (step instanceof Error) throw step;
    return { ok: step < 400, status: step };
  };
  return () => calls;
}

const connectFail = () =>
  Object.assign(new Error("fetch failed"), { code: "UND_ERR_CONNECT_TIMEOUT" });

const real = globalThis.fetch;
const results = [];
const check = (name, fn) => results.push([name, fn]);

check("한 번에 성공하면 그대로 반환해요", async () => {
  const calls = stubFetch([200]);
  const res = await fetchRetrying("http://x", "테스트");
  assert.equal(res.status, 200);
  assert.equal(calls(), 1);
});

check("접속 실패는 다시 걸어요", async () => {
  const calls = stubFetch([connectFail(), connectFail(), 200]);
  const res = await fetchRetrying("http://x", "테스트");
  assert.equal(res.status, 200);
  assert.equal(calls(), 3);
});

check("서버 오류(5xx)도 다시 걸어요", async () => {
  const calls = stubFetch([503, 200]);
  await fetchRetrying("http://x", "테스트");
  assert.equal(calls(), 2);
});

check("키가 틀린 4xx 는 바로 포기해요", async () => {
  const calls = stubFetch([401, 200]);
  await assert.rejects(() => fetchRetrying("http://x", "테스트"), /401/);
  assert.equal(calls(), 1);
});

check("계속 실패하면 멈춰요 (무한 재시도 금지)", async () => {
  const calls = stubFetch(Array.from({ length: 10 }, connectFail));
  await assert.rejects(() => fetchRetrying("http://x", "테스트"));
  assert.equal(calls(), 4); // 첫 시도 + 재시도 3번
});

let failed = 0;
for (const [name, fn] of results) {
  try {
    await fn();
    console.log(`  OK   ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}
globalThis.fetch = real;
console.log(failed === 0 ? "\n전부 통과" : `\n${failed}개 실패`);
process.exitCode = failed === 0 ? 0 : 1;
