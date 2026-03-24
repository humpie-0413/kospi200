# 데이터 사전 (Data Dictionary)

KOSPI200 AI 랭킹 서비스의 52컬럼 패널 전체 명세.

## 패널 개요

- **행 수**: 708,000+ (200종목 × 3,500+ 거래일, 2016~현재)
- **저장**: `panel_merged_daily.parquet`
- **갱신**: 매일 06:00 KST (11단계 파이프라인)
- **look-ahead bias 방지**: 모든 피처에 lag=1 적용

---

## 1. OHLCV (7컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 타입 |
|--------|--------|------|------|------|
| `open` | 시가 | 당일 시가 | pykrx/FDR | int |
| `high` | 고가 | 당일 고가 | pykrx/FDR | int |
| `low` | 저가 | 당일 저가 | pykrx/FDR | int |
| `close` | 종가 | 당일 종가 | pykrx/FDR | int |
| `volume` | 거래량 | 당일 거래량 | pykrx/FDR | bigint |
| `value` | 거래대금 | 거래량 × 종가 | 계산 | float |
| `ret_daily` | 일일 수익률 | 전일 대비 수익률 (shift 1) | 계산 | float |

## 2. 모멘텀 (8컬럼)

| 컬럼명 | 한글명 | 설명 | 방향 | 타입 |
|--------|--------|------|------|------|
| `price_momentum` | 가격 상승추세 | 20일 가격 모멘텀 | +1 | float |
| `price_momentum_20d` | 20일 모멘텀 | 20일 수익률 (shift 1) | +1 | float |
| `price_momentum_60d` | 60일 모멘텀 | 60일 수익률 (shift 1) | +1 | float |
| `momentum_3m` | 3개월 상승률 | 90일 모멘텀 (shift 1) | +1 | float |
| `momentum_6m` | 6개월 상승률 | 180일 모멘텀 (shift 1) | +1 | float |
| `momentum_reversal` | 모멘텀 반전 | 단기(5일) - 장기(20일) 모멘텀 차이 | +1 | float |
| `momentum_rank` | 모멘텀 순위 | 횡단면 모멘텀 백분위 | +1 | float |
| `RSI_14` | RSI | 14일 상대강도지수 (Wilder 스무딩) | +1 | float |

## 3. 리스크 (5컬럼)

| 컬럼명 | 한글명 | 설명 | 방향 | 타입 |
|--------|--------|------|------|------|
| `volatility` | 변동성 | 20일 연환산 변동성 (×√252) | -1 | float |
| `volatility_20d` | 20일 변동성 | 20일 롤링 변동성 | -1 | float |
| `volatility_60d` | 60일 변동성 | 60일 롤링 변동성 | -1 | float |
| `downside_volatility_60d` | 하방 변동성 | 60일 하락 수익률만 사용 | -1 | float |
| `max_drawdown_60d` | 60일 최대낙폭 | 60일 롤링 MDD | -1 | float |

> **방향 -1**: 값이 작을수록 좋음 (안전)

## 4. 기술적 지표 (2컬럼)

| 컬럼명 | 한글명 | 설명 | 방향 | 타입 |
|--------|--------|------|------|------|
| `bollinger_pctb` | 볼린저밴드 위치 | %B = (가격 - 하한) / (상한 - 하한) | +1 | float |
| `MACD_signal` | MACD 신호 | MACD 히스토그램 (EMA12 - EMA26 - Signal9) | +1 | float |

## 5. 수익성 (2컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 방향 | 타입 |
|--------|--------|------|------|------|------|
| `net_income` | 순이익 | 연간 순이익 (90일 lag) | DART API | +1 | float |
| `roe` | 자기자본수익률 | ROE = 순이익 / 자기자본 | DART API | +1 | float |

## 6. 가치/레버리지 (3컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 방향 | 타입 |
|--------|--------|------|------|------|------|
| `equity` | 자기자본 | 주주자본 | DART API | +1 | float |
| `debt_ratio` | 부채비율 | 부채 / 자기자본 (낮을수록 안전) | DART API | -1 | float |
| `total_liabilities` | 총부채 | 총부채 금액 (낮을수록 안전) | DART API | -1 | float |

## 7. 유동성 (2컬럼)

| 컬럼명 | 한글명 | 설명 | 방향 | 타입 |
|--------|--------|------|------|------|
| `turnover` | 회전율 | 거래량 / 상장주식수 | +1 | float |
| `volume_ratio` | 거래량 비율 | 당일 거래량 / 20일 이동평균 | +1 | float |

## 8. 뉴스 감성 (6컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 방향 | 타입 |
|--------|--------|------|------|------|------|
| `news_sentiment` | 뉴스 감성도 | (긍정 - 부정) / (전체 + 5), lag=1 | KR-FinBERT-SC | +1 | float |
| `news_conviction` | 뉴스 신뢰도 | (긍정 + 부정) / (전체 + 5), lag=1 | KR-FinBERT-SC | +1 | float |
| `news_volume` | 뉴스 건수 | 당일 기사 수, lag=1 | 네이버 API | +1 | int |
| `news_sentiment_ewm5` | 감성 EWM(5일) | 5일 지수가중이동평균, lag=1 | 계산 | +1 | float |
| `news_sentiment_ewm20` | 감성 EWM(20일) | 20일 지수가중이동평균, lag=1 | 계산 | +1 | float |
| `news_sentiment_surprise` | 감성 서프라이즈 | 감성도 - EWM20 (기대 대비 이탈), lag=1 | 계산 | +1 | float |

> **KR-FinBERT-SC**: `snunlp/KR-FinBERT-SC` — 한국어 금융 뉴스 특화 감성분석 모델

## 9. ESG (4컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 방향 | 타입 |
|--------|--------|------|------|------|------|
| `esg_score` | ESG 종합점수 | (긍정 - 부정) / (전체 + 5), lag=1 | ESG 키워드 매칭 | +1 | float |
| `environmental_score` | 환경(E) 점수 | Environmental 키워드 기사 기반 | ESG 키워드 매칭 | +1 | float |
| `social_score` | 사회(S) 점수 | Social 키워드 기사 기반 | ESG 키워드 매칭 | +1 | float |
| `governance_score` | 지배구조(G) 점수 | Governance 키워드 기사 기반 | ESG 키워드 매칭 | +1 | float |

## 10. 외부 지수 / 매크로 (7컬럼)

| 컬럼명 | 한글명 | 설명 | 소스 | 타입 |
|--------|--------|------|------|------|
| `sp500_ret_1d` | S&P500 일간 수익률 | 전일 S&P500 수익률, T-1 lag | FMP API | float |
| `vix_level` | VIX 지수 | CBOE 변동성 지수, T-1 lag | FMP API | float |
| `vix_change_1d` | VIX 일간 변화 | VIX 전일 대비 변화, T-1 lag | FMP API | float |
| `oil_ret_1d` | 유가 일간 수익률 | WTI 원유 수익률, T-1 lag | FDR | float |
| `us10y_level` | 미국 10년 금리 | 미국 10년 국채 수익률, T-1 lag | FMP API | float |
| `dxy_ret_1d` | 달러지수 수익률 | US Dollar Index 수익률, T-1 lag | FMP API | float |
| `market_regime` | 시장 국면 | bull(1) / neutral(0) / bear(-1) | 계산 | int |

> 모든 외부 지수는 date-level broadcast (종목 무관, 날짜별 동일 값)

## 11. 메타 (1컬럼)

| 컬럼명 | 한글명 | 설명 | 타입 |
|--------|--------|------|------|
| `in_universe` | KOSPI200 멤버 | 해당 월 KOSPI200 구성 종목 여부 | bool |

## 12. 카테고리 점수 (7컬럼, with_reasons 테이블)

| 컬럼명 | 한글명 | 설명 | 범위 |
|--------|--------|------|------|
| `cat_momentum` | 상승세 | 모멘텀 피처 Z-score → CDF 변환 | 0~100 |
| `cat_risk` | 안전도 | 리스크 피처 Z-score → CDF 변환 | 0~100 |
| `cat_profitability` | 수익성 | 수익성 피처 Z-score → CDF 변환 | 0~100 |
| `cat_value` | 가치 | 밸류 피처 Z-score → CDF 변환 | 0~100 |
| `cat_liquidity` | 거래활발도 | 유동성 피처 Z-score → CDF 변환 | 0~100 |
| `cat_sentiment` | 시장반응 | 뉴스 감성 피처 Z-score → CDF 변환 | 0~100 |
| `cat_esg` | 사회책임 | ESG 피처 Z-score → CDF 변환 | 0~100 |

> **계산 방법**: 카테고리 내 피처 Z-score 평균 → 정규분포 CDF × 100
> 점수 70 이상 = 상위 30% / 50 = 중간 / 30 이하 = 하위 30%

---

## 피처 → 카테고리 매핑

```
momentum:      price_momentum, price_momentum_20d, price_momentum_60d,
               momentum_3m, momentum_6m, momentum_rank, momentum_reversal,
               ret_daily, RSI_14, bollinger_pctb, MACD_signal
risk:          volatility, volatility_20d, volatility_60d,
               downside_volatility_60d, max_drawdown_60d
profitability: net_income, roe
value:         equity, total_liabilities, debt_ratio
liquidity:     turnover, volume_ratio
sentiment:     news_sentiment, news_conviction, news_volume,
               news_sentiment_ewm5, news_sentiment_ewm20, news_sentiment_surprise
esg:           esg_score, environmental_score, social_score, governance_score
macro:         sp500_ret_1d, vix_level, vix_change_1d,
               oil_ret_1d, us10y_level, dxy_ret_1d, market_regime
```

## NaN 비율 참고

| 카테고리 | 2025년 이후 비율 | 비고 |
|----------|-----------------|------|
| OHLCV/기술적 | ~0% | 거의 완전 |
| 재무 | ~0% | 연간 데이터 forward-fill |
| 뉴스 감성 | ~66% | 뉴스 없는 종목/날짜 |
| ESG | ~84% | ESG 키워드 매칭률 낮음 |
| 외부 지수 | ~0% | date-level broadcast |

> MySQL 로드 시 NaN → 0.0 변환 필수 (LOAD DATA INFILE 호환)
