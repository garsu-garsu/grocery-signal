import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

import { BannerAd } from "./components/BannerAd";
import { ScreenLayout } from "./components/ScreenLayout";
import { loadPrices, type PriceData, type PriceItem } from "./data/prices";
import { ItemDetailScreen } from "./features/detail/ItemDetailScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { palette } from "./theme";

export default function App() {
  const [data, setData] = useState<PriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PriceItem | null>(null);

  useEffect(() => {
    loadPrices()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  // 토스 네이티브 상단 바 뒤로가기를 앱 내 이동에 연결
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("backEvent", {
        onEvent: () => {
          if (selected != null) setSelected(null);
          else
            try {
              closeView();
            } catch {
              /* noop */
            }
        },
      });
    } catch {
      return undefined;
    }
  }, [selected]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: palette.bg,
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        {error != null ? (
          <Message text={error} />
        ) : data == null ? (
          <Message text="오늘 시세를 불러오는 중이에요" />
        ) : selected != null ? (
          <ItemDetailScreen item={selected} />
        ) : (
          <HomeScreen data={data} onSelect={setSelected} />
        )}
      </div>

      {/* 배너는 화면마다 따로 두지 않고 여기 하나만 띄워요 — 한 화면에 배너는 하나입니다. */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          background: palette.bg,
          padding: "0 20px",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <BannerAd />
      </div>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <ScreenLayout>
      <p style={{ fontSize: 16, color: palette.sub, textAlign: "center", marginTop: 80 }}>
        {text}
      </p>
    </ScreenLayout>
  );
}
