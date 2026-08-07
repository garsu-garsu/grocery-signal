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
 * 매일 새벽 GitHub Actions가 갱신해서 main 에 커밋하는 파일이에요.
 * 번들에 구워진 사본은 배포한 날짜에 멈추기 때문에, 실행할 때마다 원격을 먼저 읽어요.
 */
const REMOTE_URL =
  "https://raw.githubusercontent.com/garsu-garsu/grocery-signal/main/public/data/prices.json";

/** 원격이 느릴 때 로딩 화면에 갇히지 않게 끊는 시간. 장보기 직전에 30초 쓰는 앱이에요. */
const TIMEOUT_MS = 5000;

export async function loadPrices(): Promise<PriceData> {
  try {
    const res = await fetch(REMOTE_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return (await res.json()) as PriceData;
  } catch {
    // 네트워크가 막혔거나 느려요 — 아래 번들 사본으로 내려갑니다.
    // 날짜가 지난 값이라도 화면에 그대로 표시되니 사용자가 오해하지 않아요.
  }

  const res = await fetch(`/data/prices.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`시세를 불러오지 못했어요 (${res.status})`);
  return (await res.json()) as PriceData;
}
