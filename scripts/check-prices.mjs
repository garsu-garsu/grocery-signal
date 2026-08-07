/**
 * 시세를 원격에서 읽는지 확인해요.
 *
 * 앱은 실행할 때 원격(GitHub)을 먼저 읽고, 막히면 번들에 구워진 사본으로 내려갑니다.
 * 두 갈래가 모두 살아 있는지 실제 화면으로 확인해요 — 주소가 틀리거나 시세 갱신
 * 워크플로가 멈추면 여기서 걸립니다.
 *
 * 쓰기: npm run build && npx vite preview --port 4173 를 띄워두고 node scripts/check-prices.mjs
 */
import { readFile } from "node:fs/promises";

import puppeteer from "puppeteer-core";

const CHROME =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const APP = "http://localhost:4173/";
const REMOTE_URL =
  "https://raw.githubusercontent.com/garsu-garsu/grocery-signal/main/public/data/prices.json";

/** "2026-08-04" → "8월 4일" (화면 표기와 맞춰요) */
const asOfLabel = (asOf) => {
  const [, m, d] = asOf.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
};

const remote = await fetch(REMOTE_URL).then((r) => r.json());
const bundled = JSON.parse(await readFile("public/data/prices.json", "utf8"));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
});

async function shownDate({ blockRemote }) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem("onboarded", "1"));
  if (blockRemote) {
    await page.setRequestInterception(true);
    page.on("request", (r) =>
      r.url().includes("raw.githubusercontent.com") ? r.abort() : r.continue(),
    );
  }
  await page.goto(APP, { waitUntil: "networkidle0" });
  const text = await page.$eval("main", (el) => el.textContent ?? "");
  await page.close();
  return text.match(/\d+월 \d+일/)?.[0] ?? "(못 찾음)";
}

try {
  const checks = [
    ["원격 정상", await shownDate({ blockRemote: false }), asOfLabel(remote.asOf)],
    ["원격 차단", await shownDate({ blockRemote: true }), asOfLabel(bundled.asOf)],
  ];

  let failed = false;
  for (const [name, got, want] of checks) {
    const ok = got === want;
    if (!ok) failed = true;
    console.log(`${name}: ${got} (기대 ${want}) ${ok ? "OK" : "FAIL"}`);
  }

  if (remote.asOf === bundled.asOf) {
    console.log(
      "참고: 원격과 번들의 기준일이 같아 두 갈래를 구분하지 못했어요. 시세가 갱신된 뒤 다시 확인하세요.",
    );
  }
  process.exitCode = failed ? 1 : 0;
} finally {
  await browser.close();
}
