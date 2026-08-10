import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

import { BannerAd } from "./components/BannerAd";
import { ScreenLayout } from "./components/ScreenLayout";
import { loadPrices, type PriceData, type PriceItem } from "./data/prices";
import { ItemDetailScreen } from "./features/detail/ItemDetailScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen";
import { EVENT, track, trackScreen } from "./lib/analytics";
import { palette } from "./theme";

const ONBOARDED_KEY = "grocery-signal:onboarded";

/** 미니앱 종료. closeView 는 Promise 를 돌려줘서 거절도 함께 삼켜요. */
function closeApp() {
  try {
    void closeView().catch(() => {});
  } catch {
    /* 브라우저 등 미지원 환경 */
  }
}

export default function App() {
  // 첫 실행이면 소개 화면부터 — 한 번 보고 나면 다시 뜨지 않아요.
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(ONBOARDED_KEY) != null,
  );
  const [data, setData] = useState<PriceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PriceItem | null>(null);

  useEffect(() => {
    loadPrices()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    trackScreen(
      !onboarded ? "onboarding" : selected != null ? "detail" : "home",
    );
  }, [onboarded, selected]);

  // 토스 네이티브 상단 바 뒤로가기를 앱 내 이동에 연결
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("backEvent", {
        onEvent: () => {
          if (selected != null) setSelected(null);
          else closeApp();
        },
      });
    } catch {
      return undefined;
    }
  }, [selected]);

  // 우측 상단 닫기(홈) 버튼 — 어느 화면에 있든 앱을 닫아요.
  // backEvent 만 구독하면 이 버튼을 아무도 처리하지 않아 눌러도 안 닫혀요.
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("homeEvent", { onEvent: closeApp });
    } catch {
      return undefined;
    }
  }, []);

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
        {!onboarded ? (
          <OnboardingScreen
            onStart={() => {
              localStorage.setItem(ONBOARDED_KEY, "1");
              track(EVENT.onboardingComplete);
              setOnboarded(true);
            }}
          />
        ) : error != null ? (
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
