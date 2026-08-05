export interface PricePoint {
  d: string; // YYYY-MM-DD
  p: number; // 원
}

export interface PriceItem {
  id: string;
  name: string;
  unit: string; // "1포기", "1kg" 등
  price: number; // 당일 소매가
  prevWeek: number;
  prevMonth: number;
  normalYear: number; // 평년(최근 5년 같은 시기 평균)
  history: PricePoint[]; // 최근 30일
}

export interface PriceData {
  asOf: string; // 시세 기준일 (YYYY-MM-DD)
  source: string;
  /** 실제 KAMIS 데이터가 아니라 개발용 샘플이면 true — 화면에 반드시 표시해요. */
  sample: boolean;
  items: PriceItem[];
}

/**
 * 시세는 매일 새벽 GitHub Actions가 public/data/prices.json 으로 떨궈요.
 * 앱은 그냥 그 파일 하나만 읽습니다 (서버 없음).
 */
export async function loadPrices(): Promise<PriceData> {
  const res = await fetch(`/data/prices.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`시세를 불러오지 못했어요 (${res.status})`);
  return (await res.json()) as PriceData;
}
