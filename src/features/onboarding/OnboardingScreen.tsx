import { Button } from "@toss/tds-mobile";

import { ScreenLayout } from "../../components/ScreenLayout";
import { palette } from "../../theme";

interface Props {
  onStart: () => void;
}

const STEPS = [
  {
    emoji: "🚦",
    title: "오늘 살까, 미룰까를 신호로 봐요",
    body: "초록불은 사세요, 빨간불은 미루세요. 평년·지난주 시세와 견줘서 정해요.",
  },
  {
    emoji: "📊",
    title: "무엇과 견줄지 고를 수 있어요",
    body: "지난주·한 달 전·평년 중에서 고르면 목록 문구와 순서가 그 기준으로 바뀌어요.",
  },
  {
    emoji: "📅",
    title: "매일 아침 자동으로 갱신돼요",
    body: "공공데이터포털(한국농수산식품유통공사) 소매가를 씁니다. 언제 조사된 값인지 화면에 그대로 적혀 있어요.",
  },
];

/** 첫 실행에 한 번만 보여주는 소개 화면. */
export function OnboardingScreen({ onStart }: Props) {
  return (
    <ScreenLayout hideAd>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.ink, margin: "8px 0 4px" }}>
        장보기 신호등
      </h1>
      <p style={{ fontSize: 15, color: palette.sub, margin: "0 0 20px" }}>
        오늘 뭐가 싼지, 신호로 알려드려요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STEPS.map((s) => (
          <div
            key={s.title}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              background: palette.card,
              border: `1px solid ${palette.line}`,
              borderRadius: 16,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1.2 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: palette.ink }}>
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: palette.sub,
                  marginTop: 4,
                }}
              >
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <Button size="xlarge" display="full" onClick={onStart}>
          시작하기
        </Button>
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 18,
          fontSize: 13,
          color: palette.sub,
          lineHeight: 1.6,
        }}
      >
        지금까지의 시세를 알려드릴 뿐, 앞으로 오를지 내릴지는 말하지 않아요.
      </p>
    </ScreenLayout>
  );
}
