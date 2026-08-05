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
npm run prices:seed   # 샘플 시세 생성 (KAMIS 키 없이 화면 확인용)
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
[Extract]  scripts/fetch-kamis.mjs   ← GitHub Actions 매일 06:00 KST
[Store]    public/data/prices.json   ← 커밋되는 정적 파일 (서버 없음, 유지비 0원)
[Serve]    앱은 이 JSON 하나만 읽음
```

| 파일 | 역할 |
|---|---|
| `src/lib/signal.ts` | 🟢 사세요 / 🔴 미루세요 판정 — 앱의 유일한 도메인 로직 |
| `src/hooks/useAdGate.ts` | 보상형 광고 게이트 |
| `src/hooks/useUnlock.ts` | 해금 상태를 그날 자정(KST)까지 유지 |
| `scripts/fetch-kamis.mjs` | 실제 시세 수집 |
| `scripts/make-seed.mjs` | 개발용 샘플 (`sample: true` 표시됨) |

## 점검

```bash
npm run check:signal   # 신호 판정 경계값 자체 점검
npm run typecheck
```

## 출시 전 반드시

- [ ] **KAMIS 인증키 발급 → `npm run prices`로 실제 데이터 교체.** 지금 `public/data/prices.json`은
      `sample: true`인 가짜 값이고, 앱 화면에 "샘플 데이터예요"가 뜹니다
- [ ] GitHub Secrets에 `KAMIS_CERT_KEY` / `KAMIS_CERT_ID` 등록
- [ ] KAMIS 응답의 `dpr1~dpr7` 필드 매핑을 실제 응답으로 한 번 눈으로 확인
      (`scripts/fetch-kamis.mjs`의 `toItem` 주석 참고)
- [ ] 토스 콘솔에서 광고 그룹 ID 발급 → `.env`
- [ ] **콘솔에 등록한 appName 과 `apps-in-toss.config.ts`의 `appName` 일치 확인**
- [ ] 앱 이름·아이콘을 콘솔에서 설정 (SDK 3.x부터 config가 아니라 콘솔에서 관리)
- [ ] SDK 3.x CORS — 백엔드를 붙이면 Origin 허용 목록에 아래 두 도메인 등록
      `https://grocery-signal.web.tossmini.com` (서비스) /
      `https://grocery-signal.private-web.tossmini.com` (콘솔 QR 테스트)
- [ ] **SDK 3.x로 출시하면 2.x로 롤백 불가** — QR로 충분히 테스트 후 출시

## 30일 그래프에 대해

히스토리는 **매일 한 점씩 쌓입니다.** 품목별 KAMIS 코드 표를 만들지 않으려고
카테고리 조회 하나만 쓰기 때문이에요. 그래서 그래프는 배포 후 30일에 걸쳐 채워집니다.
당장 30일치가 필요하면 `periodProductList`로 백필하는 스크립트를 따로 쓰세요.
