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

/**
 * 히스토리에서 n일 전 가격 (그날 값이 없으면 가장 가까운 과거 값).
 *
 * 칸 수로 세면 안 돼요 — 주말·공휴일엔 장이 서지 않아 시세가 비어요.
 * 실제로 28칸이 38일에 걸쳐 있어서, 21칸 전은 21일 전이 아니라 약 4주 전이에요.
 */
function priceDaysAgo(item: PriceItem, days: number): number | null {
  const h = item.history;
  if (h.length === 0) return null;
  const dayMs = 86400000;
  const target = Date.parse(`${h[h.length - 1].d}T00:00:00Z`) - days * dayMs;
  if (Number.isNaN(target)) return null;
  for (let i = h.length - 1; i >= 0; i--) {
    if (Date.parse(`${h[i].d}T00:00:00Z`) <= target) return h[i].p;
  }
  return null;
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

/**
 * 화면에 "얼마나 싼지"를 보여줄 때 무엇과 견줄지.
 * 신호(초록·빨강) 판정 규칙은 이것과 무관하게 그대로예요 — 보여주는 잣대만 바뀝니다.
 */
export type Basis = "week" | "month" | "normal";

export const BASIS_OPTIONS: { value: Basis; label: string }[] = [
  { value: "week", label: "지난주" },
  { value: "month", label: "한 달 전" },
  { value: "normal", label: "평년" },
];

function basisPrice(item: PriceItem, basis: Basis): number {
  if (basis === "week") return item.prevWeek;
  if (basis === "month") return item.prevMonth;
  return item.normalYear;
}

/** 선택한 기준 대비 등락률(%) — 반올림한 값이에요. */
export function basisPct(item: PriceItem, basis: Basis): number {
  return Math.round(rawPct(item.price, basisPrice(item, basis)));
}

/** 받침이 있으면 "과", 없으면 "와" — 지난주'와', 평년'과'. */
function withGwa(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = isHangul && (code - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? "과" : "와"}`;
}

/** 목록 한 줄에 그대로 쓰는 문구. "지난주보다 12% 싸요" */
export function basisText(item: PriceItem, basis: Basis): string {
  const label = BASIS_OPTIONS.find((o) => o.value === basis)?.label ?? "평년";
  const p = basisPct(item, basis);
  if (p === 0) return `${withGwa(label)} 비슷해요`;
  return `${label}보다 ${Math.abs(p)}% ${p > 0 ? "비싸요" : "싸요"}`;
}

/** 살 만한 순 → 미룰 순으로 정렬 (선택한 기준으로 싼 것부터) */
export function sortByDeal(items: PriceItem[], basis: Basis = "normal"): PriceItem[] {
  return [...items].sort((a, b) => basisPct(a, basis) - basisPct(b, basis));
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR");
}
