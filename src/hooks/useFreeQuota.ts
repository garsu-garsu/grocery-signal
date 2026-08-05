import { useCallback, useState } from "react";

import { kstDate } from "../lib/kst";

type Saved = { date: string; ids: string[] };

function read(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw == null) return [];
    const saved = JSON.parse(raw) as Saved;
    return saved.date === kstDate() ? saved.ids : [];
  } catch {
    return [];
  }
}

/**
 * 하루에 `limit`개까지는 광고 없이 열어주는 무료 몫이에요.
 * 첫 방문에 광고부터 들이대면 "광고 보라는 앱"으로 기억되니,
 * 값어치를 먼저 겪게 하고 그다음에 광고를 부탁합니다.
 */
export function useFreeQuota(key: string, limit: number) {
  const storageKey = `free:${key}`;
  const [ids, setIds] = useState<string[]>(() => read(storageKey));

  /** 이미 무료로 연 항목이거나, 남은 몫이 있으면 열어주고 한 칸 씁니다. */
  const claim = useCallback(
    (id: string): boolean => {
      if (ids.includes(id)) return true;
      if (ids.length >= limit) return false;
      const next = [...ids, id];
      setIds(next);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ date: kstDate(), ids: next } satisfies Saved),
      );
      return true;
    },
    [ids, limit, storageKey],
  );

  return { claim, usedCount: ids.length };
}
