// 개발용 샘플 시세 생성 — KAMIS 인증키 없이 화면을 확인하려고 씁니다.
// 만들어지는 파일에는 sample: true 가 박히고, 앱은 그걸 보고 화면에 경고를 띄워요.
// 실제 시세가 아니니 절대 이 상태로 출시하지 마세요.
//
// 실행: node scripts/make-seed.mjs

import { writeFile } from "node:fs/promises";

const OUT = new URL("../public/data/prices.json", import.meta.url);
const HISTORY_DAYS = 30;

// [이름, 단위, 대략적인 현재가, 평년 대비 배수]
const SEED = [
  ["애호박", "1개", 1180, 0.68],
  ["시금치", "100g", 2400, 0.79],
  ["감자", "100g", 620, 0.86],
  ["양파", "1kg", 2280, 0.91],
  ["오이", "10개", 12400, 0.94],
  ["배추", "1포기", 4180, 0.97],
  ["상추", "100g", 1520, 1.01],
  ["사과", "10개", 24800, 1.03],
  ["바나나", "1kg", 3450, 1.05],
  ["돼지고기", "100g", 2680, 1.07],
  ["계란", "30개", 7900, 1.12],
  ["무", "1개", 2380, 1.14],
  ["마늘", "1kg", 11200, 1.18],
  ["배", "10개", 38900, 1.24],
  ["대파", "1kg", 4200, 1.41],
];

// 시드 고정 난수 — 매번 같은 샘플이 나와야 화면 비교가 됩니다.
let seed = 20260805;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function kstToday() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

function dateBefore(days) {
  return new Date(Date.now() + 9 * 3600000 - days * 86400000)
    .toISOString()
    .slice(0, 10);
}

const today = kstToday();

const items = SEED.map(([name, unit, price, ratio], idx) => {
  // 30일 전 → 오늘로 이어지는 완만한 곡선 + 잡음
  const start = Math.round(price * (0.9 + rand() * 0.25));
  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const t = i / (HISTORY_DAYS - 1);
    const base = start + (price - start) * t;
    const noise = (rand() - 0.5) * price * 0.04;
    return { d: dateBefore(HISTORY_DAYS - 1 - i), p: Math.round(base + noise) };
  });
  history[history.length - 1].p = price;

  return {
    id: `sample-${idx}`,
    name,
    unit,
    price,
    prevWeek: history[HISTORY_DAYS - 8].p,
    prevMonth: history[0].p,
    normalYear: Math.round(price / ratio),
    history,
  };
});

const out = {
  asOf: today,
  source: "샘플 데이터 (KAMIS 아님)",
  sample: true,
  items,
};

await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`샘플 ${items.length}개 품목 생성 (${today})`);
