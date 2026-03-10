"""AI 분석 리포트 엔드포인트 — Gemini(1차) / Groq(2차) 활용"""
import asyncio
import json
import logging
import time
import urllib.request
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# 간단 캐시: {(ticker, horizon): (timestamp, result)}
_cache: dict[tuple, tuple[float, dict]] = {}
CACHE_TTL = 3600  # 1시간


def _get_stock_data(db: Session, ticker: str, horizon: str) -> Optional[dict]:
    """DB에서 종목 랭킹 데이터 조회"""
    from app.services.ranking_service import get_ticker_name

    table = "ranking_long_daily_with_reasons" if horizon == "long_term" else "ranking_short_daily_with_reasons"
    row = db.execute(
        text(f"""
            SELECT date, ticker, score_total, rank_total,
                   top_feature_1, contrib_1, percentile_1,
                   top_feature_2, contrib_2, percentile_2,
                   top_feature_3, contrib_3, percentile_3,
                   cat_momentum, cat_risk, cat_profitability,
                   cat_value, cat_liquidity, cat_sentiment, cat_esg
            FROM {table}
            WHERE ticker = :ticker
            ORDER BY date DESC LIMIT 1
        """),
        {"ticker": ticker},
    ).fetchone()
    if not row:
        return None
    data = dict(row._mapping)
    data["name"] = get_ticker_name(ticker)
    return data


def _build_prompt(data: dict, horizon: str) -> str:
    h_label = "장기(120일)" if horizon == "long_term" else "단기(20일)"
    features = []
    for i in range(1, 4):
        f = data.get(f"top_feature_{i}", "")
        c = data.get(f"contrib_{i}", 0)
        p = data.get(f"percentile_{i}", 0)
        if f:
            features.append(f"{f} (기여도 {c:.4f}, 상위 {p:.0f}%)")

    return f"""당신은 한국 주식시장 전문 애널리스트입니다. 아래 AI 랭킹 데이터를 기반으로 초보 투자자가 이해할 수 있도록 분석해주세요.

종목: {data.get('name', '')} ({data.get('ticker', '')})
분석 기준: {h_label} 호라이즌
전체 순위: {data.get('rank_total', '')}위 / 200종목
종합 점수: {data.get('score_total', 0):.4f}

핵심 기여 피처 (TOP 3):
{chr(10).join(f'  {i+1}. {f}' for i, f in enumerate(features))}

카테고리별 점수:
  모멘텀: {data.get('cat_momentum', 0):.4f}
  리스크: {data.get('cat_risk', 0):.4f}
  수익성: {data.get('cat_profitability', 0):.4f}
  가치: {data.get('cat_value', 0):.4f}
  유동성: {data.get('cat_liquidity', 0):.4f}
  뉴스감성: {data.get('cat_sentiment', 0):.4f}
  ESG: {data.get('cat_esg', 0):.4f}

다음 형식으로 한국어 분석 리포트를 작성하세요 (마크다운 금지, 순수 텍스트):
1. 종합 평가 (2-3문장): 이 종목이 왜 이 순위인지 핵심 이유
2. 강점 (2-3문장): 어떤 지표가 좋은지, 초보자도 이해할 수 있게
3. 주의 사항 (2-3문장): 리스크 요인이나 주의할 점

투자 권유나 매수/매도 조언은 절대 하지 마세요. 객관적 데이터 분석만 제공하세요."""


def _call_gemini(prompt: str, api_key: str) -> str:
    """Google Gemini API 호출"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800},
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["candidates"][0]["content"]["parts"][0]["text"]


def _call_groq(prompt: str, api_key: str) -> str:
    """Groq API 호출 (Llama 3)"""
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 800,
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["choices"][0]["message"]["content"]


def _generate_analysis(prompt: str) -> tuple[str, str]:
    """AI 분석 생성 — Gemini 우선, Groq 폴백"""
    settings = get_settings()
    if settings.gemini_api_key:
        try:
            return _call_gemini(prompt, settings.gemini_api_key), "gemini"
        except Exception as e:
            logger.warning("Gemini failed: %s", e)
    if settings.groq_api_key:
        try:
            return _call_groq(prompt, settings.groq_api_key), "groq"
        except Exception as e:
            logger.warning("Groq failed: %s", e)
    raise HTTPException(status_code=503, detail="AI 서비스 일시 불가")


@router.get("/analysis/{ticker}")
async def get_analysis(
    ticker: str,
    horizon: str = Query("long_term", pattern="^(short_term|long_term)$"),
    db: Session = Depends(get_db),
):
    """종목별 AI 분석 리포트"""
    cache_key = (ticker, horizon)
    now = time.time()
    if cache_key in _cache:
        ts, cached = _cache[cache_key]
        if now - ts < CACHE_TTL:
            return cached

    data = _get_stock_data(db, ticker, horizon)
    if not data:
        raise HTTPException(status_code=404, detail="종목 데이터 없음")

    prompt = _build_prompt(data, horizon)
    text, provider = await asyncio.to_thread(_generate_analysis, prompt)

    result = {
        "ticker": ticker,
        "name": data.get("name", ""),
        "horizon": horizon,
        "analysis": text,
        "provider": provider,
    }
    _cache[cache_key] = (now, result)
    return result
