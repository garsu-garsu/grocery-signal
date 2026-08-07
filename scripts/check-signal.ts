// 신호 판정 자체 점검. 실행: npm run check:signal
import assert from "node:assert/strict";

import type { PriceItem } from "../src/data/prices.ts";
import { basisText, judge, sortByDeal } from "../src/lib/signal.ts";

function item(over: Partial<PriceItem>): PriceItem {
  return {
    id: "t",
    name: "테스트",
    unit: "1개",
    price: 1000,
    prevWeek: 1000,
    prevMonth: 1000,
    normalYear: 1000,
    history: [],
    ...over,
  };
}

/** n일 전부터 오늘까지 가격이 이어지는 히스토리 */
function history(prices: number[]): PriceItem["history"] {
  return prices.map((p, i) => ({ d: `2026-07-${String(i + 1).padStart(2, "0")}`, p }));
}

// 평년보다 10% 이상 싸면 사세요
assert.equal(judge(item({ price: 900, normalYear: 1000 })).signal, "buy");
assert.equal(judge(item({ price: 901, normalYear: 1000 })).signal, "normal");

// 평년은 보통인데 지난주보다 15% 이상 내렸어도 사세요
assert.equal(judge(item({ price: 850, prevWeek: 1000, normalYear: 900 })).signal, "buy");

// 평년보다 15% 이상 비싸면 미루세요
assert.equal(judge(item({ price: 1150, normalYear: 1000 })).signal, "wait");
assert.equal(judge(item({ price: 1149, normalYear: 1000 })).signal, "normal");

// 3주 연속 상승이면 평년 수준이어도 미루세요
// (판정은 21·14·7일 전 세 지점을 날짜로 찾습니다 — 칸 수가 아니에요)
const up30 = Array.from({ length: 30 }, (_, i) => 800 + i * 10);
assert.equal(judge(item({ price: 1050, normalYear: 1000, history: history(up30) })).signal, "wait");

// 오르내림이 섞이면 3주 연속 상승이 아니다
const wobbly30 = [...up30];
wobbly30[15] = 700; // 14일 전이 21일 전보다 쌌다면 연속 상승이 아님
assert.equal(
  judge(item({ price: 1050, normalYear: 1000, history: history(wobbly30) })).signal,
  "normal",
);

// 날짜에 구멍이 있어도 "21·14·7일 전"을 날짜로 찾는다.
// (주말·공휴일엔 시세가 없어 실제 데이터가 이렇게 생겼어요)
function datedHistory(points: [string, number][]): PriceItem["history"] {
  return points.map(([d, p]) => ({ d, p }));
}
// 07-30 기준 21일 전=07-09, 14일 전=07-16, 7일 전=07-23.
// 그 세 날은 비어 있어서 각각 07-08 · 07-15 · 07-22 값을 써야 해요.
const gappy = datedHistory([
  ["2026-07-01", 500],
  ["2026-07-08", 900], // 21일 전 자리
  ["2026-07-15", 1000], // 14일 전 자리
  ["2026-07-22", 1100], // 7일 전 자리
  ["2026-07-30", 1200],
]);
assert.equal(
  judge(item({ price: 1200, normalYear: 1200, history: gappy })).signal,
  "wait",
);
// 칸 수로 셌다면 07-01·07-08·07-15 를 보게 되고, 그래도 상승이라 통과해 버려요.
// 그래서 "날짜로는 하락, 칸 수로는 상승"인 경우로 한 번 더 확인해요.
const gappyDown = datedHistory([
  ["2026-07-01", 100],
  ["2026-07-08", 200], // 칸 기준 21일 전
  ["2026-07-15", 300], // 칸 기준 14일 전
  ["2026-07-22", 1300], // 날짜 기준 7일 전 — 오늘보다 비쌈
  ["2026-07-30", 1200],
]);
assert.equal(
  judge(item({ price: 1200, normalYear: 1200, history: gappyDown })).signal,
  "normal",
);

// 0으로 나누지 않는다
assert.equal(judge(item({ price: 1000, normalYear: 0, prevWeek: 0 })).signal, "normal");

// 싼 것부터 정렬
const sorted = sortByDeal([
  item({ id: "a", price: 1200, normalYear: 1000 }),
  item({ id: "b", price: 800, normalYear: 1000 }),
  item({ id: "c", price: 1000, normalYear: 1000 }),
]);
assert.deepEqual(sorted.map((i) => i.id), ["b", "c", "a"]);

// 비교 기준을 바꾸면 문구도 그 기준으로 바뀐다
const mixed = item({ price: 900, prevWeek: 1000, prevMonth: 1200, normalYear: 1800 });
assert.equal(basisText(mixed, "week"), "지난주보다 10% 싸요");
assert.equal(basisText(mixed, "month"), "한 달 전보다 25% 싸요");
assert.equal(basisText(mixed, "normal"), "평년보다 50% 싸요");
assert.equal(basisText(item({ price: 1000, prevWeek: 1000 }), "week"), "지난주와 비슷해요");
assert.equal(basisText(item({ price: 1100, prevWeek: 1000 }), "week"), "지난주보다 10% 비싸요");

// 기준이 바뀌면 정렬 순서도 그 기준을 따른다
const byWeek = sortByDeal(
  [
    item({ id: "a", price: 900, prevWeek: 1000, normalYear: 900 }), // 주간 -10%, 평년 0%
    item({ id: "b", price: 1000, prevWeek: 1000, normalYear: 1200 }), // 주간 0%, 평년 -17%
  ],
  "week",
);
assert.deepEqual(byWeek.map((i) => i.id), ["a", "b"]);
assert.deepEqual(sortByDeal(byWeek, "normal").map((i) => i.id), ["b", "a"]);

// 기준값이 0이어도 터지지 않는다
assert.equal(basisText(item({ price: 1000, prevWeek: 0 }), "week"), "지난주와 비슷해요");

console.log("신호 판정 점검 통과");
