import { Button, useToast } from "@toss/tds-mobile";
import { useEffect, useState } from "react";

import { palette } from "../theme";
import { EVENT, track } from "../lib/analytics";
import {
  NOTIFY_SLOTS,
  agreedSlot,
  createShareLink,
  isNotifySupported,
  requestNotify,
  shareApp,
  type NotifySlotCode,
} from "../lib/toss";
import { Card } from "./ScreenLayout";

/** 홈 하단 — 알림 받기 / 친구에게 알려주기. */
export function HomeActions() {
  const toast = useToast();
  const [agreed, setAgreed] = useState(agreedSlot);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const notifySupported = isNotifySupported();

  useEffect(() => {
    createShareLink()
      .then(setShareLink)
      .catch(() => setShareLink(null));
  }, []);

  const onNotify = async (code: NotifySlotCode) => {
    try {
      const result = await requestNotify(code);
      track(EVENT.notifyConsent, { result, slot: code });
      if (result === "agreementRejected") return;
      setAgreed(code);
      toast.openToast(
        result === "alreadyAgreed"
          ? "이미 알림을 받고 있어요."
          : "이제 그 시간에 알려드릴게요.",
      );
    } catch {
      toast.openToast("알림을 설정하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const onShare = () => {
    if (shareLink == null) {
      toast.openToast("공유를 준비 중이에요. 잠시 후 다시 눌러 주세요.");
      return;
    }
    shareApp(shareLink)
      .then(() => track(EVENT.shareCompleted))
      .catch(() => {
        toast.openToast("공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      });
  };

  return (
    <Card style={{ marginTop: 20 }}>
      {notifySupported && (
        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: palette.ink,
              margin: "0 0 4px",
            }}
          >
            장보기 전에 알려드릴까요?
          </p>
          <p style={{ fontSize: 14, color: palette.sub, margin: "0 0 12px" }}>
            {agreed == null
              ? "받고 싶은 시간을 골라 주세요."
              : "알림을 받고 있어요. 시간은 언제든 바꿀 수 있어요."}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {NOTIFY_SLOTS.map((slot) => (
              <Button
                key={slot.code}
                size="medium"
                display="block"
                variant={agreed === slot.code ? "fill" : "weak"}
                color={agreed === slot.code ? "primary" : "dark"}
                style={
                  agreed === slot.code ? { background: palette.primary } : undefined
                }
                onClick={() => void onNotify(slot.code)}
              >
                {slot.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button size="medium" display="block" variant="weak" color="dark" onClick={onShare}>
        친구에게 알려주기
      </Button>
    </Card>
  );
}
