import { Notification, Review, Share } from "@apps-in-toss/web-framework";

/**
 * 알림 슬롯 — 콘솔에 등록한 정기 발송 그룹 코드와 1:1로 짝지어요.
 * 코드를 바꾸면 콘솔의 발송 코드도 같이 바꿔야 알림 동의 화면이 떠요.
 */
export const NOTIFY_SLOTS = [
  { code: "grocery-signal-morning", label: "매일 아침 8시" },
  { code: "grocery-signal-evening", label: "매일 저녁 6시" },
] as const;

export type NotifySlotCode = (typeof NOTIFY_SLOTS)[number]["code"];

const AGREED_KEY = "notify:agreed";
const REVIEW_KEY = "review:asked";

export function isNotifySupported(): boolean {
  try {
    return Notification.requestAgreement.isSupported();
  } catch {
    return false;
  }
}

/** 동의한 슬롯 — 화면 표시용이에요. 실제 발송 대상은 토스가 관리해요. */
export function agreedSlot(): string | null {
  return localStorage.getItem(AGREED_KEY);
}

/** 알림 동의 화면을 열고 결과를 돌려줘요. */
export function requestNotify(code: NotifySlotCode): Promise<string> {
  return new Promise((resolve, reject) => {
    let cleanup: unknown;
    // 반환값이 함수라는 보장이 없어요 — 토스 앱 버전에 따라 아무것도 안 돌려줍니다.
    const done = (fn: () => void) => {
      fn();
      if (typeof cleanup === "function") cleanup();
    };
    try {
      cleanup = Notification.requestAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            localStorage.setItem(AGREED_KEY, code);
          }
          done(() => resolve(result.type));
        },
        onError: (error) => done(() => reject(error)),
      });
    } catch (error) {
      reject(error);
    }
  });
}

/** 공유 링크는 화면을 열 때 미리 받아둬요. */
export function createShareLink(): Promise<string> {
  return Share.createLink({ path: "intoss://grocery-signal" });
}

/**
 * 네이티브 공유 시트를 열어요.
 * 버튼을 누른 뒤 await 를 거치면 사용자 제스처가 풀려 시트가 안 열려요 —
 * 그래서 링크를 인자로 받고 여기선 곧바로 시트만 띄웁니다.
 */
export function shareApp(link: string): Promise<void> {
  return Share.sendMessage({
    message: `오늘 뭘 사면 이득인지 알려주는 앱이에요\n${link}`,
  });
}

/**
 * 리뷰 요청은 평생 한 번만. 광고까지 보고 전체 시세를 열어본 직후에만 불러요 —
 * 앱을 켜자마자 물어보면 그냥 별점 낮게 주고 나갑니다.
 */
export async function askReviewOnce(): Promise<void> {
  if (localStorage.getItem(REVIEW_KEY) === "1") return;
  try {
    if (!Review.request.isSupported()) return;
    localStorage.setItem(REVIEW_KEY, "1");
    await Review.request();
  } catch {
    /* 리뷰는 실패해도 사용자에게 알릴 일이 아니에요. */
  }
}
