"""시장 현황 API (P1-10)"""
from fastapi import APIRouter
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data_drive" / "data_backup"


@router.get("/status")
def get_market_status():
    """시장 현황 — VIX, S&P500, 시장 국면 (인증 불요)"""
    try:
        import pandas as pd
        parquet_path = DATA_DIR / "external_indices_daily.parquet"
        if not parquet_path.exists():
            return {"available": False}

        df = pd.read_parquet(parquet_path)
        if df.empty:
            return {"available": False}

        latest = df.iloc[-1]

        vix = float(latest.get("vix_level", 0))
        if vix < 20:
            vix_status = "안정"
        elif vix < 30:
            vix_status = "주의"
        else:
            vix_status = "불안"

        regime = str(latest.get("market_regime", "neutral"))
        regime_labels = {
            "bull": "상승장", "bear": "하락장",
            "neutral": "횡보장", "volatility": "변동장",
        }
        regime_emoji = {
            "bull": "🟢", "bear": "🔴",
            "neutral": "🟡", "volatility": "🟠",
        }

        return {
            "available": True,
            "date": str(latest["date"]),
            "vix_level": round(vix, 1),
            "vix_status": vix_status,
            "market_regime": regime,
            "regime_label": regime_labels.get(regime, "횡보장"),
            "regime_emoji": regime_emoji.get(regime, "🟡"),
            "sp500_ret_1d": round(float(latest.get("sp500_ret_1d", 0)), 2),
            "us10y_level": round(float(latest.get("us10y_level", 0)), 2),
        }
    except Exception as e:
        logger.error("Market status error: %s", e)
        return {"available": False}
