import type { PriceItem } from "../data/prices";

export type Signal = "buy" | "wait" | "normal";

export interface Verdict {
  signal: Signal;
  /** 화면에 그대로 쓰는 한 줄. "평년보다 32% 싸요" */
  reason: string;
  /** 평년 대비 등락률 (%) */
  vsNormal: number;
  /** 1주 전 대비 등락률 (%) */
  vsWeek: number;
}

/** 등락률(%) — 반올림 전 원값. 임계값 비교는 이걸 쓰고, 화면 표시만 반올림해요. */
function rawPct(now: number, base: number): number {
  if (base <= 0) return 0;
  return ((now - base) / base) * 100;
}

/** 히스토리에서 n일 전 가격 (없으면 가장 가까운 과거 값) */
function priceDaysAgo(item: PriceItem, days: number): number | null {
  const h = item.history;
  if (h.length === 0) return null;
  const idx = h.length - 1 - days;
  if (idx < 0) return null;
  return h[idx].p;
}

/** 3주 연속 상승: 21일 전 < 14일 전 < 7일 전 < 오늘 */
function risingThreeWeeks(item: PriceItem): boolean {
  const w3 = priceDaysAgo(item, 21);
  const w2 = priceDaysAgo(item, 14);
  const w1 = priceDaysAgo(item, 7);
  if (w3 == null || w2 == null || w1 == null) return false;
  return w3 < w2 && w2 < w1 && w1 < item.price;
}

/**
 * 신호 판정. "예측"이 아니라 지금까지의 사실만 말해요 —
 * 앞으로 오른다/내린다고 단정하면 한 번 틀렸을 때 신뢰를 잃습니다.
 */
export function judge(item: PriceItem): Verdict {
  const normalRaw = rawPct(item.price, item.normalYear);
  const weekRaw = rawPct(item.price, item.prevWeek);
  const vsNormal = Math.round(normalRaw);
  const vsWeek = Math.round(weekRaw);

  if (normalRaw <= -10) {
    return { signal: "buy", reason: `평년보다 ${-vsNormal}% 싸요`, vsNormal, vsWeek };
  }
  if (weekRaw <= -15) {
    return { signal: "buy", reason: `지난주보다 ${-vsWeek}% 내렸어요`, vsNormal, vsWeek };
  }
  if (normalRaw >= 15) {
    return { signal: "wait", reason: `평년보다 ${vsNormal}% 비싸요`, vsNormal, vsWeek };
  }
  if (risingThreeWeeks(item)) {
    return { signal: "wait", reason: "3주째 오르고 있어요", vsNormal, vsWeek };
  }
  return {
    signal: "normal",
    reason: vsNormal === 0 ? "평년과 비슷해요" : `평년보다 ${Math.abs(vsNormal)}% ${vsNormal > 0 ? "비싸요" : "싸요"}`,
    vsNormal,
    vsWeek,
  };
}

/** 살 만한 순 → 미룰 순으로 정렬 (평년 대비 싼 것부터) */
export function sortByDeal(items: PriceItem[]): PriceItem[] {
  return [...items].sort((a, b) => judge(a).vsNormal - judge(b).vsNormal);
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR");
}
