import type { Signal } from "./lib/signal";

// 신호등 팔레트 — 초록(사세요) / 노랑(보통) / 빨강(미루세요) + 따뜻한 크림 배경.
// 40~50대 타겟이라 대비를 높게 잡았어요.
export const palette = {
  primary: "#2E9E5B",
  primaryDeep: "#1F7A43",
  down: "#2E9E5B", // 초록불 = 사세요
  mid: "#C9881A", // 노란불 = 보통 (흰 배경에서 읽히도록 노랑을 어둡게 낮춘 값)
  up: "#D94A32", // 빨간불 = 미루세요
  flat: "#8C8577", // 신호가 아닌 단순 증감 표시용
  ink: "#2A2622",
  sub: "#6E675E",
  line: "rgba(46,158,91,0.14)",
  card: "#FFFFFF",
  bg: "#FAF7F2",
  white: "#FFFFFF",
};

/**
 * 신호별 색·기호·제목. 색만으로 구분하지 않아요 —
 * 색각 이상이거나 햇빛 아래 화면이면 초록/노랑/빨강이 구분되지 않습니다.
 */
export function signalStyle(signal: Signal): {
  color: string;
  mark: string;
  title: string;
} {
  if (signal === "buy") return { color: palette.down, mark: "▼", title: "지금 사세요" };
  if (signal === "wait") return { color: palette.up, mark: "▲", title: "조금 미루세요" };
  return { color: palette.mid, mark: "●", title: "보통이에요" };
}
