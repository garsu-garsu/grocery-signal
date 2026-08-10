import { Button, SegmentedControl } from "@toss/tds-mobile";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { CoachMark } from "../../components/CoachMark";
import { HomeActions } from "../../components/HomeActions";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import type { PriceData, PriceItem } from "../../data/prices";
import { useAdGate } from "../../hooks/useAdGate";
import { useOnboarding } from "../../hooks/useOnboarding";
import { useUnlock } from "../../hooks/useUnlock";
import { EVENT, track } from "../../lib/analytics";
import { formatKorDate } from "../../lib/kst";
import { askReviewOnce } from "../../lib/toss";
import {
  BASIS_OPTIONS,
  basisPct,
  basisText,
  formatWon,
  judge,
  sortByDeal,
  type Basis,
  type Signal,
} from "../../lib/signal";
import { palette, signalStyle } from "../../theme";

const FREE_PER_SIDE = 2; // 무료로 보여주는 개수 (사세요 2 + 미루세요 2)
const BASIS_KEY = "basis";

function savedBasis(): Basis {
  const saved = localStorage.getItem(BASIS_KEY);
  return BASIS_OPTIONS.some((o) => o.value === saved)
    ? (saved as Basis)
    : "week";
}

export function HomeScreen({
  data,
  onSelect,
}: {
  data: PriceData;
  onSelect: (item: PriceItem) => void;
}) {
  const { unlocked, unlock } = useUnlock("all-items");
  const { watchThen } = useAdGate();
  const [basis, setBasis] = useState<Basis>(savedBasis);

  const changeBasis = (value: string) => {
    setBasis(value as Basis);
    localStorage.setItem(BASIS_KEY, value);
  };

  const sorted = sortByDeal(data.items, basis);
  const buys = sorted.filter((i) => judge(i).signal === "buy");
  const waits = sorted.filter((i) => judge(i).signal === "wait").reverse();
  const mids = sorted.filter((i) => judge(i).signal === "normal");

  // 초록·빨강이 하나도 없는 날엔 노란불이라도 무료로 보여줘요.
  // 안 그러면 첫 화면이 "없어요" 두 장이라 앱이 고장 난 것처럼 보입니다.
  const nothingNotable = buys.length === 0 && waits.length === 0;
  const freeMids = nothingNotable ? FREE_PER_SIDE * 2 : 0;

  // 잠긴 품목도 이름은 보여줘요. 목록을 통째로 숨기면 "광고 봐야 뭐라도 나오는 앱"이 됩니다.
  const shownIds = new Set(
    [
      ...(unlocked ? buys : buys.slice(0, FREE_PER_SIDE)),
      ...(unlocked ? waits : waits.slice(0, FREE_PER_SIDE)),
      ...(unlocked ? mids : mids.slice(0, freeMids)),
    ].map((i) => i.id),
  );
  const lockedItems = unlocked ? [] : sorted.filter((i) => !shownIds.has(i.id));

  // 오늘 화면에 실제로 있는 것만 짚어줘요 — 빨간불이 없는 날엔 그 단계를 건너뜁니다.
  const steps = useMemo(() => {
    const list: string[] = [];
    if (buys.length > 0) list.push("buy");
    if (waits.length > 0) list.push("wait");
    list.push("notify");
    return list;
  }, [buys.length, waits.length]);
  const { current, next } = useOnboarding(steps);
  const actionsRef = useRef<HTMLDivElement>(null);
  const buyRef = useRef<HTMLDivElement>(null);
  const waitRef = useRef<HTMLDivElement>(null);

  // 알림 단계는 화면 아래에 있어서, 먼저 보이게 옮겨 놓고 짚어줘요.
  useEffect(() => {
    if (current === "notify") {
      actionsRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [current]);

  // 강조된 카드는 TDS 덮개에 가려 직접 눌리지 않아요. 덮개보다 위에 레이어를 얹는 것도
  // z-index 싸움이라, 아예 캡처 단계에서 클릭을 먼저 가로채 어디를 눌러도 진행되게 합니다.
  const firstBuy = buys[0];
  useEffect(() => {
    if (current == null) return;
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      next();
      // 첫 단계에선 짚어준 품목을 실제로 열어 보여줘요 — 말로 설명하는 것보다 빠릅니다.
      if (current === "buy" && firstBuy != null) onSelect(firstBuy);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [current, next, firstBuy, onSelect]);

  return (
    <ScreenLayout>
      <header style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: palette.ink,
            margin: 0,
          }}
        >
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

      {/* 무엇과 견줄지 고르는 곳 — 기본은 체감이 가장 빠른 '지난주'예요. */}
      <div style={{ marginBottom: 4 }}>
        <SegmentedControl value={basis} onChange={changeBasis}>
          {BASIS_OPTIONS.map((option) => (
            <SegmentedControl.Item key={option.value} value={option.value}>
              {option.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
      </div>

      <Section signal="buy">
        <ItemList
          items={unlocked ? buys : buys.slice(0, FREE_PER_SIDE)}
          emptyText="오늘은 특별히 싼 품목이 없어요."
          basis={basis}
          firstRef={buyRef}
          onSelect={onSelect}
        />
      </Section>

      <Section signal="wait">
        <ItemList
          items={unlocked ? waits : waits.slice(0, FREE_PER_SIDE)}
          emptyText="오늘은 특별히 비싼 품목이 없어요."
          basis={basis}
          firstRef={waitRef}
          onSelect={onSelect}
        />
      </Section>

      {(unlocked || freeMids > 0) && mids.length > 0 && (
        <Section signal="normal">
          {(unlocked ? mids : mids.slice(0, freeMids)).map((item) => (
            <PriceRow
              key={item.id}
              item={item}
              basis={basis}
              onClick={() => onSelect(item)}
            />
          ))}
        </Section>
      )}

      {lockedItems.length > 0 && (
        <>
          <section style={{ marginTop: 20 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: palette.sub,
                margin: "0 0 10px",
              }}
            >
              나머지 {lockedItems.length}개 품목
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lockedItems.map((item) => (
                <LockedRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <Card style={{ marginTop: 16, textAlign: "center" }}>
            <Button
              display="block"
              size="large"
              style={{ background: palette.primary, minHeight: 52 }}
              onClick={() =>
                watchThen(() => {
                  unlock();
                  track(EVENT.itemsUnlocked, {
                    target: "all_items",
                    locked_count: lockedItems.length,
                  });
                  // 광고 창이 닫히는 동안 겹치지 않게 한 박자 뒤에 물어봐요.
                  setTimeout(() => void askReviewOnce(), 1500);
                })
              }
            >
              가격까지 보기 (광고 후)
            </Button>
            <p style={{ fontSize: 13, color: palette.sub, margin: "10px 0 0" }}>
              한 번 열면 오늘 하루 계속 볼 수 있어요
            </p>
          </Card>
        </>
      )}

      <div ref={actionsRef}>
        <HomeActions />
      </div>

      <CoachMark
        targetRef={buyRef}
        open={current === "buy"}
        message="초록불은 오늘 사면 이득이에요. 눌러서 자세히 볼까요?"
      />
      <CoachMark
        targetRef={waitRef}
        open={current === "wait"}
        message="빨간불은 며칠 뒤에 사는 게 나아요"
      />
      <CoachMark
        targetRef={actionsRef}
        open={current === "notify"}
        message="알림 받으면 잊지 않아요. 시간을 골라 보세요"
      />

      <p
        style={{
          fontSize: 13,
          color: palette.sub,
          marginTop: 20,
          lineHeight: 1.6,
        }}
      >
        출처: {data.source} · 전국 평균 소매가라 지역·매장에 따라 다를 수
        있어요.
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </section>
  );
}

/**
 * 잠긴 품목 — 이름과 단위는 그대로 두고 신호·가격만 가려요.
 * 색띠까지 보이면 답이 다 나와버려서 회색으로 눕힙니다.
 */
function LockedRow({ item }: { item: PriceItem }) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 5,
          alignSelf: "stretch",
          borderRadius: 3,
          background: "rgba(42,38,34,0.12)",
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
        <div
          className="skeleton"
          style={{ width: 116, height: 14, marginTop: 8 }}
        />
      </div>
      <div
        className="skeleton"
        style={{ width: 74, height: 24 }}
        aria-label="가격 잠김"
      />
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <p style={{ fontSize: 15, color: palette.sub, margin: 0 }}>{text}</p>
    </Card>
  );
}

/** 사세요/미루세요 목록 — 첫 항목에만 코치마크가 짚어줄 ref를 달아요. */
function ItemList({
  items,
  emptyText,
  basis,
  firstRef,
  onSelect,
}: {
  items: PriceItem[];
  emptyText: string;
  basis: Basis;
  firstRef: RefObject<HTMLDivElement>;
  onSelect: (item: PriceItem) => void;
}) {
  if (items.length === 0) return <Empty text={emptyText} />;
  return (
    <>
      {items.map((item, i) => {
        const row = (
          <PriceRow item={item} basis={basis} onClick={() => onSelect(item)} />
        );
        return i === 0 ? (
          <div key={item.id} ref={firstRef}>
            {row}
          </div>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </>
  );
}

function PriceRow({
  item,
  basis,
  onClick,
}: {
  item: PriceItem;
  basis: Basis;
  onClick: () => void;
}) {
  const v = judge(item);
  const { color } = signalStyle(v.signal);

  // 기호·글씨색은 '선택한 기준'의 등락을 따라요.
  // 신호(초록·빨강)와 기준 비교는 서로 다른 얘기라서, 한 줄에 섞으면
  // "빨간불인데 싸요" 같은 모순이 생깁니다. 신호는 왼쪽 색띠와 섹션 제목이 맡아요.
  const pct = basisPct(item, basis);
  const pctColor = pct < 0 ? palette.down : pct > 0 ? palette.up : palette.flat;
  const pctMark = pct < 0 ? "▼" : pct > 0 ? "▲" : "—";

  return (
    <Card
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
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
        <div style={{ fontSize: 15, color: pctColor, marginTop: 4, fontWeight: 600 }}>
          {pctMark} {basisText(item, basis)}
        </div>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: palette.ink,
          whiteSpace: "nowrap",
        }}
      >
        {formatWon(item.price)}
        <span style={{ fontSize: 15, fontWeight: 600 }}>원</span>
      </div>
    </Card>
  );
}
