// KAMIS 농산물유통정보 → public/data/prices.json
//
// 매일 새벽 GitHub Actions가 돌립니다. 서버 없이 정적 JSON 하나로 끝내는 구조예요.
//
// 30일 히스토리는 과거를 한 번에 긁어오지 않고 **매일 한 점씩 쌓습니다.**
// 품목별 KAMIS 코드(itemcode/kindcode) 표를 만들지 않아도 되고, 이 스크립트가
// 카테고리 조회 하나만 쓰면 되기 때문이에요. 대신 그래프는 30일에 걸쳐 채워집니다.
// 당장 30일치가 필요하면 periodProductList로 백필하는 스크립트를 따로 쓰세요.
//
// 실행: KAMIS_CERT_KEY=... KAMIS_CERT_ID=... node scripts/fetch-kamis.mjs

import { readFile, writeFile } from "node:fs/promises";

const CERT_KEY = process.env.KAMIS_CERT_KEY;
const CERT_ID = process.env.KAMIS_CERT_ID;
const OUT = new URL("../public/data/prices.json", import.meta.url);

const CATEGORIES = ["100", "200", "400", "500"]; // 식량작물·채소류·과일류·축산물

// 40~50대 장바구니 기준 품목. item_name 부분일치로 고릅니다.
const WHITELIST = [
  "배추", "무", "양파", "대파", "감자", "시금치", "애호박",
  "오이", "상추", "마늘", "계란", "돼지고기", "사과", "배", "바나나",
];

const HISTORY_DAYS = 30;

/** "3,180" → 3180 · "-" / "" → null */
function num(v) {
  if (typeof v !== "string") return null;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function kstToday() {
  const kst = new Date(Date.now() + 9 * 3600000);
  return kst.toISOString().slice(0, 10);
}

async function fetchCategory(category, regday) {
  const url = new URL("http://www.kamis.or.kr/service/price/xml.do");
  url.search = new URLSearchParams({
    action: "dailyPriceByCategoryList",
    p_product_cls_code: "01", // 01 소매
    p_country_code: "1101", // 서울 — KAMIS 대표 지역. 전국 평균이 필요하면 여러 지역 평균으로 바꾸세요.
    p_regday: regday,
    p_convert_kg_yn: "N",
    p_item_category_code: category,
    p_cert_key: CERT_KEY,
    p_cert_id: CERT_ID,
    p_returntype: "json",
  }).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`KAMIS ${category} 응답 ${res.status}`);
  const json = await res.json();

  // 응답이 비면 배열 대신 빈 문자열/객체가 오는 경우가 있어요.
  const items = json?.data?.item;
  if (!Array.isArray(items)) return [];
  return items;
}

/**
 * dpr 필드 매핑. KAMIS 문서 기준이지만 응답 스키마가 바뀐 적이 있으니
 * 첫 실행 때 raw 응답을 한 번 눈으로 확인하세요.
 *   dpr1 당일 / dpr2 1일전 / dpr3 1주일전 / dpr5 1개월전 / dpr7 평년
 */
function toItem(raw) {
  const price = num(raw.dpr1);
  if (price == null) return null;
  return {
    name: String(raw.item_name ?? "").trim(),
    unit: String(raw.unit ?? "").trim(),
    price,
    prevWeek: num(raw.dpr3) ?? price,
    prevMonth: num(raw.dpr5) ?? price,
    normalYear: num(raw.dpr7) ?? price,
  };
}

function slug(name, index) {
  return `${encodeURIComponent(name)}-${index}`;
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return { items: [] };
  }
}

async function main() {
  if (!CERT_KEY || !CERT_ID) {
    console.error(
      "KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요해요.\n" +
        "발급: https://www.kamis.or.kr → 오픈API 신청\n" +
        "키 없이 화면만 확인하려면: npm run prices:seed",
    );
    process.exit(1);
  }

  const today = kstToday();
  const previous = await readPrevious();
  const prevHistory = new Map(previous.items.map((i) => [i.name, i.history ?? []]));

  const raws = (await Promise.all(CATEGORIES.map((c) => fetchCategory(c, today)))).flat();

  const seen = new Set();
  const items = [];
  for (const raw of raws) {
    const item = toItem(raw);
    if (item == null) continue;
    if (!WHITELIST.some((w) => item.name.includes(w))) continue;
    if (seen.has(item.name)) continue; // 품종이 여러 개면 첫 번째만
    seen.add(item.name);

    const history = [...(prevHistory.get(item.name) ?? [])]
      .filter((p) => p.d !== today)
      .concat({ d: today, p: item.price })
      .slice(-HISTORY_DAYS);

    items.push({ id: slug(item.name, items.length), ...item, history });
  }

  if (items.length === 0) {
    // 조용히 빈 파일을 쓰면 앱이 "오늘은 품목이 없어요"를 보여줍니다. 그건 거짓말이에요.
    throw new Error("KAMIS에서 품목을 하나도 못 받았어요. 기존 파일을 유지하고 실패로 끝냅니다.");
  }

  const out = {
    asOf: today,
    source: "KAMIS 농산물유통정보",
    sample: false,
    items,
  };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`${items.length}개 품목 저장 (${today})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
