# 장보기 신호등 (grocery-signal)

오늘 마트에서 뭘 사면 이득이고 뭘 미뤄야 하는지, 매일 시세로 알려주는 앱인토스 미니앱.

기획서: [기획.md](./기획.md) · 근거 데이터: [../\_plans/00-앱인토스-실측지표.md](../_plans/00-앱인토스-실측지표.md)

`npx create-ait-app grocery-signal` 로 생성한 뒤 `npx ait migrate v3` 로 SDK 3.x 로 올린 프로젝트입니다.

> **`apps-in-toss.config.ts`의 `appName` 은 개발자센터 콘솔에서 앱을 등록할 때 입력한 이름과
> 반드시 같아야 합니다.** 지금은 `grocery-signal` 로 두었으니, 콘솔에 다른 이름으로 등록했다면
> 그 값으로 바꾸세요.

## 시작하기

```bash
npm install
npm run prices        # 실제 시세 받아오기 (.env 에 DATA_GO_KR_KEY 필요)
npm run dev
```

`.env.example`를 `.env`로 복사해 값을 채웁니다. **광고 ID를 비워두면 광고 없이 바로 해금**되니
개발 중에는 그대로 두면 됩니다.

## 배포

```bash
npm run build    # vite build && ait build → grocery-signal.ait 생성
npm run deploy
```

배포 API 키는 [앱인토스 콘솔](https://apps-in-toss.toss.im/) > 워크스페이스 > API 키에서 발급합니다.

## 구조

```
[Extract]  scripts/fetch-prices.mjs  ← GitHub Actions 매일 06:00 KST
[Store]    public/data/prices.json   ← 커밋되는 정적 파일 (서버 없음, 유지비 0원)
[Serve]    앱은 이 JSON 하나만 읽음
```

| 파일 | 역할 |
|---|---|
| `src/lib/signal.ts` | 🟢 사세요 / 🔴 미루세요 판정 — 앱의 유일한 도메인 로직 |
| `src/hooks/useAdGate.ts` | 보상형 광고 게이트 |
| `src/hooks/useUnlock.ts` | 해금 상태를 그날 자정(KST)까지 유지 |
| `scripts/fetch-prices.mjs` | 실제 시세 수집 (공공데이터포털) |
| `scripts/discover-items.mjs` | 품목 코드표를 API에서 훑어 뽑기 |
| `scripts/make-seed.mjs` | 개발용 샘플 (`sample: true` 표시됨) |

## 점검

```bash
npm run check:signal   # 신호 판정 경계값 자체 점검
npm run typecheck
```

## 출시 전 반드시

- [x] 인증키 발급 + 실데이터 교체 (`sample: false`)
- [ ] GitHub Secrets에 `DATA_GO_KR_KEY` 등록 (없으면 매일 갱신 워크플로가 실패)
- [ ] 토스 콘솔에서 광고 그룹 ID 발급 → `.env`
- [ ] **콘솔에 등록한 appName 과 `apps-in-toss.config.ts`의 `appName` 일치 확인**
- [ ] 앱 이름·아이콘을 콘솔에서 설정 (SDK 3.x부터 config가 아니라 콘솔에서 관리)
- [ ] SDK 3.x CORS — 백엔드를 붙이면 Origin 허용 목록에 아래 두 도메인 등록
      `https://grocery-signal.web.tossmini.com` (서비스) /
      `https://grocery-signal.private-web.tossmini.com` (콘솔 QR 테스트)
- [ ] **SDK 3.x로 출시하면 2.x로 롤백 불가** — QR로 충분히 테스트 후 출시

## 데이터에 대해 알아둘 것

- **소매가만 씁니다** (`se_cd=01`). `02`는 중도매(도매시장 경매가)라 "마트에서 얼마"와 다릅니다.
- 응답 한 행 = 한 시장의 가격입니다. 같은 날짜끼리 평균 내 **전국 대표값**을 만듭니다.
  지역 편차가 있어 화면에 명시하고 있어요.
- **평년 가격 필드가 API에 없습니다.** 최근 3년 같은 시기(±7일)를 따로 조회해 계산합니다.
  그래서 품목당 호출이 4~5회, 전체 하루 ~80회입니다 (한도 10,000회).
- 주말·공휴일은 가격 조사가 없어 30일 구간에 실제로는 20~27개 점만 찍힙니다. 정상입니다.
- 품목 코드는 `npm run prices:items` 로 API에서 다시 뽑을 수 있습니다.
