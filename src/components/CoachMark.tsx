import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

const PAD = 6;

/**
 * 온보딩 코치마크 — 대상만 남기고 화면을 어둡게 덮어요.
 *
 * TDS `Highlight`를 쓰다가 직접 그리는 쪽으로 왔어요. 그쪽은 강조된 영역 위에서
 * 클릭이 삼켜져 "눌러 보세요"라고 해놓고 아무 일도 안 일어나는 죽은 영역이 생깁니다.
 * 여기선 덮개가 `pointer-events: none`이라 클릭이 그대로 통과하고,
 * 진행은 HomeScreen이 창 전체에서 가로채요.
 */
export function CoachMark({
  targetRef,
  open,
  message,
}: {
  targetRef: RefObject<HTMLElement | null>;
  open: boolean;
  message: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const update = () => {
      const next = targetRef.current?.getBoundingClientRect() ?? null;
      setRect((prev) =>
        prev != null &&
        next != null &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };

    // 부드러운 스크롤로 대상이 아직 움직이는 중일 수 있어요.
    // 멎을 때까지 매 프레임 따라가야 구멍이 엉뚱한 곳에 남지 않습니다.
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      update();
      if (performance.now() - start < 1000) raf = requestAnimationFrame(tick);
    };
    tick();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, targetRef]);

  if (!open || rect == null) return null;

  // 대상이 화면 위쪽에 붙어 있으면 글씨를 아래에 둬요.
  const above = rect.top > 92;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 20,
          boxShadow: "0 0 0 9999px rgba(20,18,16,0.62)",
        }}
      />
      <p
        style={{
          position: "absolute",
          top: above ? rect.top - PAD - 40 : rect.bottom + PAD + 14,
          left: 16,
          right: 16,
          margin: 0,
          textAlign: "center",
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.4,
          textShadow: "0 1px 6px rgba(0,0,0,0.55)",
        }}
      >
        {message}
      </p>
    </div>,
    document.body,
  );
}
