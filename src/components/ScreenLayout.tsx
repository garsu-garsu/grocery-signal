import type { CSSProperties, ReactNode } from "react";

import { ImageBannerAd } from "./BannerAd";
import { palette } from "../theme";

/** 공통 화면 틀 — 상단 바는 토스 네이티브가 처리하고, 여기선 본문만. */
export function ScreenLayout({
  children,
  hideAd,
}: {
  children: ReactNode;
  /** 소개·인트로 화면처럼 광고를 띄우면 안 되는 곳에서 켜요. */
  hideAd?: boolean;
}) {
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
          // 하단 고정 배너에 마지막 줄이 가리지 않게 자리를 비워둬요.
          paddingBottom: "calc(max(32px, env(safe-area-inset-bottom)) + 96px)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}

        {/* 이미지 강조형 배너 — 본문을 끝까지 내린 사람에게만 보여요.
            하단 고정 배너는 창에 붙어 있고, 이건 콘텐츠 흐름의 맨 끝입니다. */}
        <div style={{ marginTop: 24 }}>
          {!hideAd && <ImageBannerAd />}
        </div>
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
