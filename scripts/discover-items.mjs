// 품목 코드표를 API에서 훑어서 뽑아요. 결과를 보고 fetch-prices.mjs 의 ITEMS 를 채웁니다.
//
// perDay API 는 ctgry_cd(부류) + item_cd(품목)가 필수라 품목별로 호출해야 하는데,
// 코드 목록을 주는 API 가 따로 없어요. 그래서 부류별로 코드 구간을 훑어
// 응답에 잡히는 item_nm 을 수집합니다. 코드표는 거의 안 바뀌니 가끔만 돌리면 돼요.
//
// 실행: DATA_GO_KR_KEY=... node scripts/discover-items.mjs

const KEY = process.env.DATA_GO_KR_KEY;
const BASE = "https://apis.data.go.kr/B552845/perDay/price";

const CATEGORIES = {
  100: "식량작물",
  200: "채소류",
  300: "특용작물",
  400: "과일류",
  500: "축산물",
  600: "수산물",
};

/** 최근 조사일이 잡히도록 넉넉히 잡아요 (주말·공휴일은 조사가 없어요). */
const TO = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
const FROM = new Date(Date.now() + 9 * 3600000 - 14 * 86400000)
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, "");

async function probe(ctgry, item) {
  const qs = [
    `serviceKey=${KEY}`,
    "returnType=JSON",
    "pageNo=1",
    "numOfRows=1",
    `cond[exmn_ymd::GTE]=${FROM}`,
    `cond[exmn_ymd::LTE]=${TO}`,
    `cond[ctgry_cd::EQ]=${ctgry}`,
    `cond[item_cd::EQ]=${item}`,
    "cond[se_cd::EQ]=01", // 소매만
  ].join("&");

  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) return null;
  const json = await res.json();
  const row = json?.response?.body?.items?.item?.[0];
  if (row == null) return null;
  return { code: String(item), name: row.item_nm, unit: row.unit, unitSize: row.unit_sz };
}

/** 동시 요청을 limit 개로 묶어요 — 공공 API 라 과하게 때리지 않습니다. */
async function pooled(tasks, limit = 8) {
  const out = [];
  for (let i = 0; i < tasks.length; i += limit) {
    out.push(...(await Promise.all(tasks.slice(i, i + limit).map((t) => t()))));
  }
  return out;
}

async function main() {
  if (!KEY) {
    console.error("DATA_GO_KR_KEY 환경변수가 필요해요.");
    process.exit(1);
  }
  console.log(`조사일 범위 ${FROM} ~ ${TO}, 소매(se_cd=01) 기준\n`);

  for (const [ctgry, ctgryName] of Object.entries(CATEGORIES)) {
    const base = Number(ctgry);
    const codes = Array.from({ length: 100 }, (_, i) => base + i);
    const found = (await pooled(codes.map((c) => () => probe(ctgry, c)))).filter(Boolean);

    if (found.length === 0) continue;
    console.log(`## ${ctgry} ${ctgryName}`);
    for (const f of found) {
      console.log(`  ${f.code}  ${f.name}  (${f.unitSize}${f.unit})`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
