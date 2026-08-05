// 공공데이터포털(한국농수산식품유통공사) 일별 소매가 → public/data/prices.json
//
// 매일 새벽 GitHub Actions 가 돌립니다. 서버 없이 정적 JSON 하나로 끝내요.
//
// API: https://apis.data.go.kr/B552845/perDay/price  (data.go.kr 15156057)
//  - ctgry_cd(부류) + item_cd(품목)가 필수예요. 빠지면 에러가 아니라 0건이 옵니다.
//  - se_cd=01 이 소매. 02 는 중도매(도매시장 경매가)라 이 앱엔 안 맞아요.
//  - 응답 한 행 = 한 시장의 가격이라, 같은 날짜끼리 평균 내서 전국 대표값을 만듭니다.
//  - 평년 가격 필드가 없어서 최근 3년 같은 시기를 직접 조회해 계산해요.
//
// 실행: DATA_GO_KR_KEY=... node scripts/fetch-prices.mjs

import { writeFile } from "node:fs/promises";

const KEY = process.env.DATA_GO_KR_KEY;
const BASE = "https://apis.data.go.kr/B552845/perDay/price";
const OUT = new URL("../public/data/prices.json", import.meta.url);

const HISTORY_DAYS = 30;
const LOOKBACK_DAYS = 40; // 30일 그래프 + 조사 없는 날(주말·공휴일) 여유
const NORMAL_YEARS = 3; // 평년 = 최근 3년 같은 시기 평균
const NORMAL_WINDOW = 7; // 같은 시기 = 그 해 같은 날짜 ±7일

// 코드는 scripts/discover-items.mjs 로 뽑았어요. 거의 안 바뀌지만 바뀌면 다시 돌리면 됩니다.
const ITEMS = [
  { ctgry: "200", code: "211", name: "배추" },
  { ctgry: "200", code: "231", name: "무" },
  { ctgry: "200", code: "245", name: "양파" },
  { ctgry: "200", code: "246", name: "파" },
  { ctgry: "200", code: "213", name: "시금치" },
  { ctgry: "200", code: "224", name: "호박" },
  { ctgry: "200", code: "223", name: "오이" },
  { ctgry: "200", code: "214", name: "상추" },
  { ctgry: "200", code: "258", name: "깐마늘" },
  { ctgry: "100", code: "152", name: "감자" },
  { ctgry: "100", code: "151", name: "고구마" },
  { ctgry: "400", code: "411", name: "사과" },
  { ctgry: "400", code: "412", name: "배" },
  { ctgry: "400", code: "418", name: "바나나" },
  { ctgry: "800", code: "812", name: "두부" },
  { ctgry: "800", code: "818", name: "콩나물" },
];

const DAY = 86400000;
const kstNow = () => new Date(Date.now() + 9 * 3600000);
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const iso = (d) => d.toISOString().slice(0, 10);
/** "20260805" → "2026-08-05" */
const toIso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

async function fetchRows(item, from, to) {
  const rows = [];
  for (let page = 1; page <= 5; page++) {
    const qs = [
      `serviceKey=${KEY}`,
      "returnType=JSON",
      `pageNo=${page}`,
      "numOfRows=1000",
      `cond[exmn_ymd::GTE]=${from}`,
      `cond[exmn_ymd::LTE]=${to}`,
      `cond[ctgry_cd::EQ]=${item.ctgry}`,
      `cond[item_cd::EQ]=${item.code}`,
      "cond[se_cd::EQ]=01",
    ].join("&");

    const res = await fetch(`${BASE}?${qs}`);
    if (!res.ok) throw new Error(`${item.name} ${from}~${to} 응답 ${res.status}`);
    const json = await res.json();
    const body = json?.response?.body;
    const got = body?.items?.item ?? [];
    rows.push(...got);
    if (rows.length >= (body?.totalCount ?? 0) || got.length === 0) break;
  }
  return rows;
}

/** 같은 날짜 행들을 평균내 [{d, p}] 로. 시장·지역이 여러 개라 하루에 수십 행이 옵니다. */
function dailyAverages(rows) {
  const byDate = new Map();
  for (const r of rows) {
    const price = Number(r.exmn_dd_prc);
    if (!Number.isFinite(price) || price <= 0) continue;
    const list = byDate.get(r.exmn_ymd) ?? [];
    list.push(price);
    byDate.set(r.exmn_ymd, list);
  }
  return [...byDate.entries()]
    .map(([date, prices]) => ({
      d: toIso(date),
      p: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}

/** history 에서 target 일 이전의 가장 가까운 값 (조사가 없는 날이 있어서 정확히 안 맞아요) */
function priceOn(history, targetIso) {
  let found = null;
  for (const point of history) {
    if (point.d <= targetIso) found = point.p;
    else break;
  }
  return found;
}

/** 평년 — 최근 N년 같은 시기(±NORMAL_WINDOW일) 평균 */
async function normalYearPrice(item, today) {
  const prices = [];
  for (let y = 1; y <= NORMAL_YEARS; y++) {
    const anchor = new Date(today);
    anchor.setUTCFullYear(anchor.getUTCFullYear() - y);
    const from = ymd(new Date(anchor.getTime() - NORMAL_WINDOW * DAY));
    const to = ymd(new Date(anchor.getTime() + NORMAL_WINDOW * DAY));
    const points = dailyAverages(await fetchRows(item, from, to));
    prices.push(...points.map((p) => p.p));
  }
  if (prices.length === 0) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

async function buildItem(item, today) {
  const rows = await fetchRows(
    item,
    ymd(new Date(today.getTime() - LOOKBACK_DAYS * DAY)),
    ymd(today),
  );
  const points = dailyAverages(rows);
  if (points.length === 0) return null;

  const history = points.slice(-HISTORY_DAYS);
  const latest = history[history.length - 1];
  const unitRow = rows[rows.length - 1];
  // 크기를 생략하면 "무 개", "파 kg" 처럼 읽혀요. 항상 붙여서 "1개", "1kg", "100g" 로.
  const unit = `${unitRow.unit_sz}${unitRow.unit}`;

  const normal = await normalYearPrice(item, today);

  return {
    id: `${item.ctgry}-${item.code}`,
    name: unitRow.item_nm ?? item.name,
    unit,
    price: latest.p,
    prevWeek: priceOn(history, iso(new Date(today.getTime() - 7 * DAY))) ?? latest.p,
    prevMonth: history[0].p,
    // 평년을 못 구하면 오늘 값을 넣어 "평년과 비슷해요"로 떨어뜨려요.
    // 없는 값을 0으로 두면 등락률이 폭주합니다.
    normalYear: normal ?? latest.p,
    history,
  };
}

async function main() {
  if (!KEY) {
    console.error(
      "DATA_GO_KR_KEY 환경변수가 필요해요.\n" +
        "발급: https://www.data.go.kr/data/15156057/openapi.do\n" +
        "키 없이 화면만 확인하려면: npm run prices:seed",
    );
    process.exit(1);
  }

  const today = kstNow();
  const items = [];
  for (const item of ITEMS) {
    const built = await buildItem(item, today);
    if (built == null) {
      console.warn(`  ${item.name}: 데이터 없음 — 건너뜁니다`);
      continue;
    }
    items.push(built);
    console.log(`  ${built.name} ${built.price}원/${built.unit} (평년 ${built.normalYear})`);
  }

  if (items.length === 0) {
    // 조용히 빈 파일을 쓰면 앱이 "오늘은 품목이 없어요"를 보여줍니다. 그건 거짓말이에요.
    throw new Error("품목을 하나도 못 받았어요. 기존 파일을 유지하고 실패로 끝냅니다.");
  }

  const asOf = items.reduce((a, i) => (i.history.at(-1).d > a ? i.history.at(-1).d : a), "");
  await writeFile(
    OUT,
    JSON.stringify(
      { asOf, source: "공공데이터포털 · 한국농수산식품유통공사", sample: false, items },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`\n${items.length}개 품목 저장 (조사일 ${asOf})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
