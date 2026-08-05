import { useCallback, useState } from "react";

import { kstDate } from "../lib/kst";

/**
 * 광고로 연 잠금은 그날 자정(KST)까지 유지돼요.
 * 하루에 같은 걸 몇 번씩 다시 보게 만들면 그냥 안 옵니다.
 */
export function useUnlock(key: string) {
  const storageKey = `unlock:${key}`;
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(storageKey) === kstDate(),
  );

  const unlock = useCallback(() => {
    localStorage.setItem(storageKey, kstDate());
    setUnlocked(true);
  }, [storageKey]);

  return { unlocked, unlock };
}
