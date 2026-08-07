import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";

import { AD_GROUP_ID_BANNER } from "../lib/env";

/** 배너 광고 — 한 화면에 1개만 (홈 최하단). */
export function BannerAd() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  // SDK 초기화. onInitialized 를 받기 전에 attachBanner 를 부르면 광고가 안 붙어요.
  useEffect(() => {
    if (AD_GROUP_ID_BANNER === "") return;
    try {
      if (!TossAds.initialize.isSupported()) return;
      TossAds.initialize({
        callbacks: {
          onInitialized: () => setReady(true),
          onInitializationFailed: (error) => console.error(error),
        },
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!ready || target == null) return;
    let detach: (() => void) | undefined;
    try {
      if (!TossAds.attachBanner.isSupported()) return;
      const attached = TossAds.attachBanner(AD_GROUP_ID_BANNER, target, {
        theme: "auto",
        variant: "card",
        callbacks: {
          onNoFill: () => console.warn("[banner] 채울 광고가 없어요"),
          onAdFailedToRender: (p) => console.error(p.error),
        },
      });
      detach = () => attached?.destroy();
    } catch (err) {
      console.error(err);
    }
    return () => {
      try {
        detach?.();
      } catch {
        /* noop */
      }
    };
  }, [ready]);

  if (AD_GROUP_ID_BANNER === "") return null;
  // 높이 0 이거나 overflow: hidden 이면 광고가 렌더링되지 않아요. 자리를 미리 잡아둡니다.
  return <div ref={targetRef} style={{ width: "100%", height: 96 }} />;
}
