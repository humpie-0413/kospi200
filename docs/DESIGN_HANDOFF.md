# KOSPI200 Rankings 페이지 디자인 핸드오프 문서

## 개요
이 문서는 `rankings.html`의 **디자인(CSS/HTML 구조)만** 변경하기 위한 가이드입니다.
비즈니스 로직(API 호출, 데이터 처리, Chart.js 렌더링)은 건드리지 않습니다.

---

## 1. 파일 구조

| 파일 | 역할 | 수정 가능 |
|------|------|-----------|
| `src/backend/templates/base.html` | 공통 레이아웃 (navbar, CDN) | O (navbar 스타일) |
| `src/backend/templates/rankings.html` | 랭킹 페이지 본문 | O (HTML 구조, 인라인 CSS) |
| `src/backend/static/css/common.css` | 공통 CSS | O (모든 스타일) |

### 템플릿 상속 구조
```
base.html
  ├─ {% block title %} → 페이지 타이틀
  ├─ {% block head %} → 추가 CSS/meta (현재 미사용)
  ├─ {% block content %} → 페이지 본문
  └─ {% block scripts %} → 페이지 JS
```

---

## 2. 외부 의존성 (CDN)

| 라이브러리 | 버전 | 용도 |
|------------|------|------|
| Bootstrap CSS | 5.1.3 | 레이아웃, 컴포넌트 |
| Bootstrap JS | 5.1.3 | 모달, 네비게이션 |
| Bootstrap Icons | 1.10.0 | 아이콘 (`bi-*`) |
| Chart.js | CDN 미포함, 필요 시 추가 | 레이더/타임라인 차트 |

> **주의**: Chart.js는 현재 `base.html`에 CDN이 없습니다. 모달 차트가 동작하려면 rankings.html의 `{% block head %}` 또는 `{% block scripts %}`에 Chart.js CDN을 추가해야 합니다:
> ```html
> <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
> ```

---

## 3. 절대 변경 금지 (JS 로직 바인딩)

아래 요소들은 JavaScript가 직접 참조합니다. **ID, onclick, data-* 속성을 변경하면 기능이 깨집니다.**

### 3-1. 필수 ID 목록

| ID | 용도 | JS 함수 |
|----|------|---------|
| `dateSelect` | 날짜 선택 드롭다운 | `loadDates()`, `loadRankings()` |
| `horizonTabs` | 단기/장기 탭 컨테이너 | `switchHorizon()` |
| `horizonInfo` | 정보 바 컨테이너 | - |
| `rankingDate` | 현재 조회 날짜 텍스트 | `loadRankings()` |
| `horizonLabel` | "장기 (120일) 관점 랭킹" 텍스트 | `switchHorizon()` |
| `perfCards` | 성과 카드 컨테이너 | `loadPerformance()` |
| `perfLabel` | 성과 라벨 배지 | `loadPerformance()` |
| `perfBuyCagr` | CAGR 값 | `loadPerformance()` |
| `perfBuySharpe` | Sharpe 값 | `loadPerformance()` |
| `perfBuyMdd` | MDD 값 | `loadPerformance()` |
| `loading` | 로딩 스피너 | `loadRankings()` |
| `rankings-content` | 메인 테이블 컨테이너 | `loadRankings()` |
| `totalCount` | "(198종목)" 텍스트 | `loadRankings()` |
| `pageInfo` | "1 / 10 페이지" 텍스트 | `loadRankings()` |
| `ranking-tbody` | 테이블 본문 (동적 생성) | `renderTable()` |
| `btnFirst` | 첫 페이지 버튼 | `renderPagination()` |
| `btnPrev` | 이전 페이지 버튼 | `renderPagination()` |
| `pageButtons` | 페이지 번호 컨테이너 | `renderPagination()` |
| `btnNext` | 다음 페이지 버튼 | `renderPagination()` |
| `btnLast` | 마지막 페이지 버튼 | `renderPagination()` |
| `tickerModal` | 종목 상세 모달 | `showTickerDetail()` |
| `modalTitle` | 모달 타이틀 | `showTickerDetail()` |
| `radarChart` | 레이더 차트 캔버스 | `drawRadar()` |
| `timelineChart` | 타임라인 차트 캔버스 | `drawTimeline()` |

### 3-2. 필수 onclick / data-* 속성

```html
<!-- 날짜 변경 -->
<select id="dateSelect" onchange="loadRankings()">

<!-- 단기/장기 탭 — data-horizon 필수 -->
<button data-horizon="short_term" onclick="switchHorizon('short_term')">
<button data-horizon="long_term" onclick="switchHorizon('long_term')">

<!-- 페이지네이션 -->
<button id="btnFirst" onclick="goPage(1)">
<button id="btnPrev" onclick="goPage(currentPage-1)">
<button id="btnNext" onclick="goPage(currentPage+1)">
<button id="btnLast" onclick="goPage(totalPages)">
```

### 3-3. JS가 동적 생성하는 HTML (renderTable 내부)

테이블 행은 JS가 innerHTML로 생성합니다. 구조를 바꾸려면 `renderTable()` 함수도 수정해야 합니다.

현재 생성되는 행 구조:
```html
<tr>
  <td><span class="rank-badge rank-1">1</span></td>
  <td><span class="ticker-link" onclick="showTickerDetail('005930')">005930</span></td>
  <td>삼성전자</td>
  <td class="score-cell score-positive">0.423</td>
  <td>
    <span class="reason-tag momentum" title="momentum_3m: 12.3%">3개월 모멘텀 (상위 5%)</span>
    <span class="reason-tag risk" title="volatility: 8.1%">변동성 (상위 12%)</span>
    <span class="reason-tag value" title="debt_ratio: 5.2%">부채비율 (상위 20%)</span>
  </td>
</tr>
```

---

## 4. 자유롭게 변경 가능한 영역

### 4-1. common.css 전체
모든 클래스의 색상, 크기, 레이아웃, 그라데이션, 애니메이션 자유롭게 변경.

주요 커스터마이징 포인트:

| CSS 클래스 | 현재 역할 | 변경 예시 |
|------------|----------|----------|
| `.page-header` | 상단 헤더 박스 | 배경색, 패딩, 그림자 |
| `.date-info` | 보라색 정보 바 | 그라데이션 색상 |
| `.rank-badge` | 순위 원형 배지 | 크기, 색상, 모양 |
| `.rank-1/2/3` | 금/은/동 배지 | 색상, 그라데이션 |
| `.rank-other` | 4위 이하 배지 | 배경, 텍스트 색 |
| `.score-cell` | 스코어 셀 | 폰트 크기, 색상 |
| `.ticker-cell` | 종목코드 셀 | 폰트 패밀리, 색상 |
| `.loading-spinner` | 로딩 표시 | 크기, 색상 |
| `@media (max-width: 768px)` | 모바일 반응형 | 브레이크포인트, 레이아웃 |

### 4-2. rankings.html 인라인 <style> (128~143줄)

| 클래스 | 현재 스타일 | 용도 |
|--------|------------|------|
| `.reason-tag` | 작은 태그 스타일 | 핵심 요인 표시 |
| `.reason-tag.momentum` | 파란 배경 | 모멘텀 카테고리 |
| `.reason-tag.risk` | 빨간 배경 | 리스크 카테고리 |
| `.reason-tag.profitability` | 초록 배경 | 수익성 카테고리 |
| `.reason-tag.value` | 주황 배경 | 가치 카테고리 |
| `.reason-tag.liquidity` | 청록 배경 | 유동성 카테고리 |
| `.reason-tag.sentiment` | 보라 배경 | 뉴스 감성 카테고리 |
| `.reason-tag.esg` | 남색 배경 | ESG 카테고리 |
| `.reason-tag.other` | 회색 배경 | 미분류 카테고리 |
| `.ticker-link` | 파란 밑줄 | 클릭 가능한 종목코드 |
| `.score-positive` | 초록 | 양수 스코어 |
| `.score-negative` | 빨강 | 음수 스코어 |
| `.score-neutral` | 회색 | 0 근처 스코어 |

### 4-3. base.html navbar

```html
<nav class="navbar navbar-expand-lg navbar-dark" style="background: linear-gradient(...);">
```
- 배경 그라데이션, 브랜드 텍스트, 네비게이션 아이템 스타일 자유 변경
- 단, href 경로(`/rankings`, `/backtest`)는 유지

### 4-4. HTML 구조 변경 (주의 필요)

요소의 **wrapper를 추가하거나 클래스를 변경**하는 것은 가능하지만, 위 섹션 3의 ID/onclick은 반드시 유지해야 합니다.

예시 — OK:
```html
<!-- 기존 -->
<div id="rankings-content" style="display:none">

<!-- 변경 OK: wrapper 추가 -->
<div class="my-custom-wrapper">
  <div id="rankings-content" style="display:none">
```

예시 — NG:
```html
<!-- ID를 변경하거나 제거하면 안 됨 -->
<div id="my-rankings" style="display:none">  <!-- NG! -->
```

---

## 5. API 데이터 형식 (참고용)

디자인에서 표시할 수 있는 데이터 필드입니다.

### GET /api/rankings
```json
{
  "date": "2026-03-06",
  "horizon": "long_term",
  "total": 198,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "date": "2026-03-06",
      "ticker": "005930",
      "name": "삼성전자",
      "score_total": 0.423,
      "rank_total": 1,
      "top_feature_1": "momentum_3m",
      "contrib_1": 0.123,
      "percentile_1": 95.2,
      "top_feature_2": "volatility",
      "contrib_2": 0.081,
      "percentile_2": 88.1,
      "top_feature_3": "debt_ratio",
      "contrib_3": 0.052,
      "percentile_3": 80.5,
      "categories": {
        "momentum": 78.3,
        "risk": 65.1,
        "profitability": 52.4,
        "value": 71.0,
        "liquidity": 45.6,
        "sentiment": null,
        "esg": null
      }
    }
  ]
}
```

### 피처 → 카테고리 매핑 (7종)

| 카테고리 | 피처들 | 색상 테마 |
|----------|--------|----------|
| momentum | momentum_3m, momentum_6m, momentum_rank, price_momentum, price_momentum_20d, price_momentum_60d, momentum_reversal, ret_daily | 파랑 |
| risk | volatility, volatility_20d, volatility_60d, max_drawdown_60d, downside_volatility_60d | 빨강 |
| profitability | net_income, roe | 초록 |
| value | equity, total_liabilities, debt_ratio | 주황 |
| liquidity | turnover, volume_ratio | 청록 |
| sentiment | news_sentiment, news_sentiment_ewm5, news_sentiment_ewm20, news_sentiment_surprise, news_volume | 보라 |
| esg | esg_score, environmental_score, social_score, governance_score | 남색 |

---

## 6. 현재 페이지 레이아웃 (위→아래 순서)

```
┌─────────────────────────────────────┐
│  Navbar (base.html)                 │
├─────────────────────────────────────┤
│  Page Header (제목 + 날짜 셀렉트)    │
├─────────────────────────────────────┤
│  Horizon Tabs (단기/장기 pill 버튼)  │
├─────────────────────────────────────┤
│  Info Bar (날짜 + 안내 텍스트)       │
├─────────────────────────────────────┤
│  Performance Card (CAGR/Sharpe/MDD) │
├─────────────────────────────────────┤
│  Loading Spinner (로드 중만 표시)    │
├─────────────────────────────────────┤
│  Rankings Table                     │
│  ┌──────────────────────────────┐   │
│  │ Card Header (제목 + 페이지)  │   │
│  ├──────────────────────────────┤   │
│  │ Table                        │   │
│  │  순위 | 코드 | 종목명 | 스코어 | 핵심요인 │
│  │  1    | 005930| 삼성전자| 0.423 | 태그들   │
│  │  ...                        │   │
│  ├──────────────────────────────┤   │
│  │ Pagination (« ‹ 1 2 3 › »)  │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  Modal (종목 클릭 시)               │
│  ┌──────────┬──────────┐            │
│  │ Radar    │ Timeline │            │
│  │ Chart    │ Chart    │            │
│  └──────────┴──────────┘            │
└─────────────────────────────────────┘
```

---

## 7. 디자인 변경 체크리스트

디자인 수정 후 아래 항목을 확인하세요:

- [ ] 날짜 드롭다운 변경 시 테이블이 갱신되는가
- [ ] 단기/장기 탭 전환이 동작하는가
- [ ] 페이지네이션 버튼이 동작하는가
- [ ] 종목코드 클릭 시 모달이 열리는가
- [ ] 모달 내 레이더/타임라인 차트가 렌더링되는가
- [ ] 모바일(768px 이하)에서 레이아웃이 깨지지 않는가
- [ ] 로딩 스피너가 표시되었다가 사라지는가

---

## 8. 빠른 시작: 색상 테마만 바꾸기

가장 간단한 커스터마이징 — `common.css`에서 색상만 변경:

```css
/* 1. 정보 바 그라데이션 */
.date-info { background: linear-gradient(135deg, #NEW_COLOR_1, #NEW_COLOR_2); }

/* 2. 금/은/동 배지 */
.rank-1 { background: linear-gradient(135deg, #NEW_GOLD_1, #NEW_GOLD_2); }

/* 3. Navbar (base.html의 inline style을 common.css로 이동 권장) */
.navbar { background: linear-gradient(135deg, #NEW_NAV_1, #NEW_NAV_2) !important; }
```

`rankings.html` 인라인 `<style>`에서 카테고리 태그 색상 변경:
```css
.reason-tag.momentum { background: #NEW_BG; color: #NEW_TEXT; }
/* ... 7개 카테고리 반복 */
```
