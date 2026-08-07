/**
 * 콘솔 스크린샷(636x1048)을 뽑아요.
 *
 * 브라우저 창 스크린샷은 DPR·창 테두리 때문에 크기가 어긋나는데,
 * 콘솔은 1px만 달라도 거부해서 뷰포트를 직접 고정하고 찍습니다.
 *
 * 쓰기: npx vite preview --port 4173 를 띄워두고 node scripts/shots.mjs
 */
import { mkdir } from "node:fs/promises";

import puppeteer from "puppeteer-core";

const CHROME =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:4173/";
const OUT = "screenshots";
const SIZE = { width: 636, height: 1048, deviceScaleFactor: 1 };

// KST 기준 오늘 — 앱의 unlock 값과 형식을 맞춰요.
const kstDate = () =>
  new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [`--window-size=${SIZE.width},${SIZE.height}`],
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport(SIZE);

  // 온보딩 코치마크와 광고 잠금을 미리 넘겨둬요 — 스토어에 보여줄 화면이 아니에요.
  const today = kstDate();
  await page.evaluateOnNewDocument((d) => {
    localStorage.setItem("onboarded", "1");
    localStorage.setItem("unlock:all-items", d);
    localStorage.setItem("unlock:chart", d);
    // 신호 판정은 평년 기준이라, 표시 기준도 평년으로 맞춰야 문구와 신호가 어긋나지 않아요.
    localStorage.setItem("basis", "normal");
  }, today);

  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/오늘의 장바구니", { timeout: 10_000 });
  await page.screenshot({ path: `${OUT}/1-home.png` });

  // 잠금이 풀린 상태라 홈이 곧 전체 목록이에요. 아래로 굴려 품목이 쭉 보이게 찍어요.
  await page.evaluate(() => {
    // 카드가 반쯤 잘린 채로 시작하지 않게 구획 제목에 맞춰 세워요.
    document.querySelector("main")?.scrollBy(0, 845);
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/2-all-items.png` });

  // 품목 상세 — 30일 그래프.
  const item = await page.$("::-p-text(상추)");
  if (item != null) {
    await item.click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUT}/3-detail.png` });
  }
} finally {
  await browser.close();
}
