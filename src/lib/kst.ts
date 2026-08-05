// 날짜 경계는 한국시간(Asia/Seoul) 기준이에요. 광고 해금이 자정에 풀립니다.

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstDate(d = new Date()): string {
  const kst = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 9 * 3600000);
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const day = String(kst.getDate()).padStart(2, "0");
  return `${kst.getFullYear()}-${m}-${day}`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** "8월 5일 (수)" */
export function formatKorDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${wd})`;
}
