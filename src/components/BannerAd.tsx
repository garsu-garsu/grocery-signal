import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";

import { AD_GROUP_ID_BANNER, AD_GROUP_ID_BANNER_IMAGE } from "../lib/env";

/**
 * 한 번 붙은 배너는 같은 광고를 계속 물고 있어요. 주기마다 떼었다 다시 붙여
 * 새 광고를 받아옵니다.
 *
 * 30초인 이유: 토스 배너는 AdMob 기반인데 AdMob 은 30초보다 잦은 갱신을
 * 무효 트래픽으로 봐요. 더 짧게 잡으면 수익보다 제재 위험이 커져요.
 */
const REFRESH_MS = 30_000;

interface Props {
  /** 광고그룹 ID. 비우면 문구 강조형(하단 고정) 지면을 써요. */
  adGroupId?: string;
  /** 자리 높이. 이미지형은 문구형보다 커요. */
  height?: number;
}

/**
 * 배너 광고.
 * - 기본값: 문구 강조형 — App.tsx 에서 화면 하단에 고정으로 하나만 띄워요.
 * - ImageBannerAd: 이미지 강조형 — 각 화면 본문 맨 아래에 붙여요.
 */
export function BannerAd({ adGroupId, height = 96 }: Props = {}) {
  const groupId = adGroupId ?? AD_GROUP_ID_BANNER;
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  // 이 값이 바뀔 때마다 아래 effect 가 다시 돌면서 배너를 새로 붙여요.
  const [round, setRound] = useState(0);

  // SDK 초기화. onInitialized 를 받기 전에 attachBanner 를 부르면 광고가 안 붙어요.
  useEffect(() => {
    if (groupId === "") return;
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
      const attached = TossAds.attachBanner(groupId, target, {
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
  }, [ready, round, groupId]);

  // 화면을 보고 있을 때만 갱신해요. 안 보이는 동안 돌리면 노출로 잡히지 않고
  // 호출만 쌓여요.
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      timer = setInterval(() => setRound((n) => n + 1), REFRESH_MS);
    };
    const stop = () => {
      if (timer != null) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready]);

  if (groupId === "") return null;
  // 높이 0 이거나 overflow: hidden 이면 광고가 렌더링되지 않아요. 자리를 미리 잡아둡니다.
  return <div ref={targetRef} style={{ width: "100%", height }} />;
}

/**
 * 이미지 강조형 배너 — 각 화면 본문 맨 아래에 붙여요.
 * 하단 고정 배너는 창에 붙어 있어 본문 흐름을 막지 않고, 이건 끝까지 내려야 보여요.
 */
export function ImageBannerAd() {
  return <BannerAd adGroupId={AD_GROUP_ID_BANNER_IMAGE} height={200} />;
}
