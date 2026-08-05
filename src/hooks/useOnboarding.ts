import { useCallback, useEffect, useState } from "react";

const KEY = "onboarded";
const STEP_KEY = "onboarded:step";

/**
 * 첫 방문에만 도는 코치마크. 화면을 한 번씩 누르면 다음으로 넘어가요.
 *
 * 튜토리얼 화면을 따로 두지 않은 이유 — 이 앱은 장보기 직전에 30초 쓰는 앱이라,
 * 오늘의 답을 늦추는 순간 그냥 나갑니다. 진짜 시세 위에 짚어주는 편이 빨라요.
 */
export function useOnboarding(steps: string[]) {
  // 상세를 보고 돌아와도 이어서 진행해야 해요 — 홈이 다시 그려지면 state는 사라지니까요.
  const [index, setIndex] = useState(() => {
    if (localStorage.getItem(KEY) === "1") return -1;
    const saved = Number(localStorage.getItem(STEP_KEY));
    return Number.isInteger(saved) && saved > 0 ? saved : 0;
  });

  // 볼 게 없는 날(신호가 하나도 없는 경우)엔 굳이 붙잡지 않아요.
  useEffect(() => {
    if (index >= 0 && steps.length === 0) {
      localStorage.setItem(KEY, "1");
      setIndex(-1);
    }
  }, [index, steps.length]);

  const next = useCallback(() => {
    setIndex((prev) => {
      if (prev < 0) return prev;
      const nextIndex = prev + 1;
      if (nextIndex >= steps.length) {
        localStorage.setItem(KEY, "1");
        localStorage.removeItem(STEP_KEY);
        return -1;
      }
      localStorage.setItem(STEP_KEY, String(nextIndex));
      return nextIndex;
    });
  }, [steps.length]);

  return { current: index >= 0 ? steps[index] : undefined, next };
}
