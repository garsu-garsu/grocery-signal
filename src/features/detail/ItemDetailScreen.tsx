import { Button } from "@toss/tds-mobile";
import { useEffect, useState } from "react";

import { Card, ScreenLayout } from "../../components/ScreenLayout";
import type { PriceItem } from "../../data/prices";
import { useAdGate } from "../../hooks/useAdGate";
import { useFreeQuota } from "../../hooks/useFreeQuota";
import { useUnlock } from "../../hooks/useUnlock";
import { formatWon, judge } from "../../lib/signal";
import { palette, signalStyle } from "../../theme";

/** 하루에 이만큼은 광고 없이 그래프를 볼 수 있어요. */
const FREE_CHARTS = 2;

export function ItemDetailScreen({ item }: { item: PriceItem }) {
  const { unlocked, unlock } = useUnlock("chart");
  const { claim } = useFreeQuota("chart", FREE_CHARTS);
  const [free, setFree] = useState(false);
  const { watchThen } = useAdGate();
  const v = judge(item);
  const { color, mark, title } = signalStyle(v.signal);

  useEffect(() => {
    setFree(claim(item.id));
  }, [item.id, claim]);

  const open = unlocked || free;

  return (
    <ScreenLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.ink, margin: 0 }}>
        {item.name}
        <span style={{ fontSize: 16, fontWeight: 500, color: palette.sub }}> {item.unit}</span>
      </h1>

      <Card style={{ marginTop: 16, textAlign: "center", padding: 24 }}>
        {/* 신호등 불 — 색과 글자를 함께 둬요. */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: color,
            color: palette.white,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          <span aria-hidden>{mark}</span>
          {title}
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: palette.ink, lineHeight: 1.1 }}>
          {formatWon(item.price)}
          <span style={{ fontSize: 22, fontWeight: 700 }}>원</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 8 }}>{v.reason}</div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Compare label="1주 전" value={item.prevWeek} now={item.price} />
        <Compare label="1개월 전" value={item.prevMonth} now={item.price} />
        <Compare label="평년" value={item.normalYear} now={item.price} last />
      </Card>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.ink, margin: "0 0 10px" }}>
          최근 30일 흐름
        </h2>
        {open ? (
          <Card>
            <Sparkline history={item.history} color={color} />
          </Card>
        ) : (
          <Card>
            {/* 그래프를 지우지 않고 흐리게만 둬요 — 모양은 보이니 열어볼 마음이 생깁니다. */}
            <div
              style={{ filter: "blur(7px)", opacity: 0.65, pointerEvents: "none" }}
              aria-hidden
            >
              <Sparkline history={item.history} color={color} />
            </div>
            <p
              style={{
                fontSize: 15,
                color: palette.sub,
                margin: "14px 0 12px",
                textAlign: "center",
              }}
            >
              오늘 무료로 볼 수 있는 그래프를 다 봤어요
            </p>
            <Button
              display="block"
              size="large"
              style={{ background: palette.primary, minHeight: 52 }}
              onClick={() => watchThen(unlock)}
            >
              그래프 보기 (광고 후)
            </Button>
          </Card>
        )}
      </section>

      <p style={{ fontSize: 13, color: palette.sub, marginTop: 20, lineHeight: 1.6 }}>
        앞으로의 가격을 예측한 값이 아니라, 지금까지 실제로 거래된 시세예요.
      </p>
    </ScreenLayout>
  );
}

function Compare({
  label,
  value,
  now,
  last,
}: {
  label: string;
  value: number;
  now: number;
  last?: boolean;
}) {
  const diff = now - value;
  const p = value > 0 ? Math.round((diff / value) * 100) : 0;
  const color = p < 0 ? palette.down : p > 0 ? palette.up : palette.flat;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${palette.line}`,
      }}
    >
      <span style={{ fontSize: 16, color: palette.sub }}>{label}</span>
      <span style={{ fontSize: 16, color: palette.ink, fontWeight: 600 }}>
        {formatWon(value)}원{" "}
        <span style={{ color, fontWeight: 700 }}>
          {p < 0 ? "▼" : p > 0 ? "▲" : "—"}
          {p !== 0 && ` ${Math.abs(p)}%`}
        </span>
      </span>
    </div>
  );
}

/** 30일 꺾은선 — 선 하나 그리자고 차트 라이브러리를 넣지 않아요. */
function Sparkline({
  history,
  color,
}: {
  history: { d: string; p: number }[];
  color: string;
}) {
  if (history.length < 2) return <p style={{ color: palette.sub }}>데이터가 부족해요.</p>;

  const W = 300;
  const H = 120;
  const prices = history.map((h) => h.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) => (i / (history.length - 1)) * W;
  const y = (p: number) => H - ((p - min) / span) * H;
  const d = history.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(h.p).toFixed(1)}`).join(" ");

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 120, display: "block", overflow: "visible" }}
        role="img"
        aria-label={`최근 30일 가격 흐름. 최저 ${formatWon(min)}원, 최고 ${formatWon(max)}원`}
      >
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={W} cy={y(prices[prices.length - 1])} r={4} fill={color} />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          color: palette.sub,
          marginTop: 8,
        }}
      >
        <span>최저 {formatWon(min)}원</span>
        <span>최고 {formatWon(max)}원</span>
      </div>
    </>
  );
}
