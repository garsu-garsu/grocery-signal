import type { CSSProperties, ReactNode } from "react";

import { palette } from "../theme";

/** 공통 화면 틀 — 상단 바는 토스 네이티브가 처리하고, 여기선 본문만. */
export function ScreenLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 20px 32px",
          paddingTop: "max(12px, env(safe-area-inset-top))",
          paddingBottom: "max(32px, env(safe-area-inset-bottom))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </main>
    </div>
  );
}

/** 흰 카드 컨테이너 */
export function Card({
  children,
  style,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: palette.card,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 12px rgba(42,38,34,0.05)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
