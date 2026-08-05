import { Button } from "@toss/tds-mobile";

import { BannerAd } from "../../components/BannerAd";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import type { PriceData, PriceItem } from "../../data/prices";
import { useAdGate } from "../../hooks/useAdGate";
import { useUnlock } from "../../hooks/useUnlock";
import { formatKorDate } from "../../lib/kst";
import { formatWon, judge, sortByDeal, type Signal } from "../../lib/signal";
import { palette, signalStyle } from "../../theme";

const FREE_PER_SIDE = 2; // 무료로 보여주는 개수 (사세요 2 + 미루세요 2)

export function HomeScreen({
  data,
  onSelect,
}: {
  data: PriceData;
  onSelect: (item: PriceItem) => void;
}) {
  const { unlocked, unlock } = useUnlock("all-items");
  const { watchThen } = useAdGate();

  const sorted = sortByDeal(data.items);
  const buys = sorted.filter((i) => judge(i).signal === "buy");
  const waits = sorted.filter((i) => judge(i).signal === "wait").reverse();
  const mids = sorted.filter((i) => judge(i).signal === "normal");

  // 초록·빨강이 하나도 없는 날엔 노란불이라도 무료로 보여줘요.
  // 안 그러면 첫 화면이 "없어요" 두 장이라 앱이 고장 난 것처럼 보입니다.
  const nothingNotable = buys.length === 0 && waits.length === 0;
  const freeMids = nothingNotable ? FREE_PER_SIDE * 2 : 0;
  const hiddenCount =
    data.items.length -
    Math.min(buys.length, FREE_PER_SIDE) -
    Math.min(waits.length, FREE_PER_SIDE) -
    Math.min(mids.length, freeMids);

  return (
    <ScreenLayout>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.ink, margin: 0 }}>
          오늘의 장바구니
        </h1>
        <p style={{ fontSize: 16, color: palette.sub, margin: "6px 0 0" }}>
          {formatKorDate(data.asOf)} 전국 평균 소매가
        </p>
        {data.sample && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(201,136,26,0.12)",
              color: palette.mid,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            샘플 데이터예요. 실제 시세가 아닙니다.
          </div>
        )}
      </header>

      <Section signal="buy">
        {buys.length === 0 ? (
          <Empty text="오늘은 특별히 싼 품목이 없어요." />
        ) : (
          (unlocked ? buys : buys.slice(0, FREE_PER_SIDE)).map((item) => (
            <PriceRow key={item.id} item={item} onClick={() => onSelect(item)} />
          ))
        )}
      </Section>

      <Section signal="wait">
        {waits.length === 0 ? (
          <Empty text="오늘은 특별히 비싼 품목이 없어요." />
        ) : (
          (unlocked ? waits : waits.slice(0, FREE_PER_SIDE)).map((item) => (
            <PriceRow key={item.id} item={item} onClick={() => onSelect(item)} />
          ))
        )}
      </Section>

      {(unlocked || freeMids > 0) && mids.length > 0 && (
        <Section signal="normal">
          {(unlocked ? mids : mids.slice(0, freeMids)).map((item) => (
            <PriceRow key={item.id} item={item} onClick={() => onSelect(item)} />
          ))}
        </Section>
      )}

      {!unlocked &&
        hiddenCount > 0 && (
          <Card style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 16, color: palette.ink, margin: "4px 0 14px", fontWeight: 600 }}>
              나머지 {hiddenCount}개 품목 시세가 있어요
            </p>
            <Button
              display="block"
              size="large"
              style={{ background: palette.primary, minHeight: 52 }}
              onClick={() => watchThen(unlock)}
            >
              광고 보고 전체 보기
            </Button>
            <p style={{ fontSize: 13, color: palette.sub, margin: "10px 0 0" }}>
              한 번 열면 오늘 하루 계속 볼 수 있어요
            </p>
          </Card>
        )}

      <div style={{ marginTop: 20 }}>
        <BannerAd />
      </div>

      <p style={{ fontSize: 13, color: palette.sub, marginTop: 20, lineHeight: 1.6 }}>
        출처: {data.source} · 전국 평균 소매가라 지역·매장에 따라 다를 수 있어요.
        <br />
        주말·공휴일은 직전 영업일 시세를 보여줘요.
      </p>
    </ScreenLayout>
  );
}

function Section({
  signal,
  children,
}: {
  signal: Signal;
  children: React.ReactNode;
}) {
  const { color, mark, title } = signalStyle(signal);
  return (
    <section style={{ marginTop: 20 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color,
          margin: "0 0 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span aria-hidden>{mark}</span>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <p style={{ fontSize: 15, color: palette.sub, margin: 0 }}>{text}</p>
    </Card>
  );
}

function PriceRow({ item, onClick }: { item: PriceItem; onClick: () => void }) {
  const v = judge(item);
  const { color, mark } = signalStyle(v.signal);

  return (
    <Card onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* 왼쪽 색띠 — 목록을 훑을 때 신호가 먼저 눈에 들어와요. */}
      <div
        style={{
          width: 5,
          alignSelf: "stretch",
          borderRadius: 3,
          background: color,
          flexShrink: 0,
        }}
        aria-hidden
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: palette.ink }}>
          {item.name}
          <span style={{ fontSize: 14, fontWeight: 500, color: palette.sub }}>
            {" "}
            {item.unit}
          </span>
        </div>
        {/* 색만으로 구분하지 않아요 — 기호와 문장을 함께 둡니다. */}
        <div style={{ fontSize: 15, color, marginTop: 4, fontWeight: 600 }}>
          {mark} {v.reason}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: palette.ink, whiteSpace: "nowrap" }}>
        {formatWon(item.price)}
        <span style={{ fontSize: 15, fontWeight: 600 }}>원</span>
      </div>
    </Card>
  );
}
