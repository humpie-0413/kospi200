from sqlalchemy import Column, Date, String, Float, Boolean, Integer
from app.database import Base


class RankingLongWithReasons(Base):
    __tablename__ = "ranking_long_daily_with_reasons"
    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    score_total = Column(Float)
    rank_total = Column(Float)
    top_feature_1 = Column(String(50))
    contrib_1 = Column(Float)
    top_feature_2 = Column(String(50))
    contrib_2 = Column(Float)
    top_feature_3 = Column(String(50))
    contrib_3 = Column(Float)
    percentile_1 = Column(Float)
    percentile_2 = Column(Float)
    percentile_3 = Column(Float)
    cat_momentum = Column(Float)
    cat_risk = Column(Float)
    cat_profitability = Column(Float)
    cat_value = Column(Float)
    cat_liquidity = Column(Float)
    cat_sentiment = Column(Float)
    cat_esg = Column(Float)
    in_universe = Column(Boolean)


class RankingShortWithReasons(Base):
    __tablename__ = "ranking_short_daily_with_reasons"
    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    score_total = Column(Float)
    rank_total = Column(Float)
    top_feature_1 = Column(String(50))
    contrib_1 = Column(Float)
    top_feature_2 = Column(String(50))
    contrib_2 = Column(Float)
    top_feature_3 = Column(String(50))
    contrib_3 = Column(Float)
    percentile_1 = Column(Float)
    percentile_2 = Column(Float)
    percentile_3 = Column(Float)
    cat_momentum = Column(Float)
    cat_risk = Column(Float)
    cat_profitability = Column(Float)
    cat_value = Column(Float)
    cat_liquidity = Column(Float)
    cat_sentiment = Column(Float)
    cat_esg = Column(Float)
    in_universe = Column(Boolean)


class RankingLongDaily(Base):
    __tablename__ = "ranking_long_daily"
    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    score_total = Column(Float)
    rank_total = Column(Float)
    score_total_long = Column(Float)
    rank_total_long = Column(Float)
    score_used = Column(Float)
    rank_used = Column(Float)
    selected_top = Column(Boolean)
    rebalance_day = Column(Boolean)
    version_tag = Column(String(50))
    in_universe = Column(Boolean)


class RankingShortDaily(Base):
    __tablename__ = "ranking_short_daily"
    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    score_total = Column(Float)
    rank_total = Column(Float)
    score_total_short = Column(Float)
    rank_total_short = Column(Float)
    in_universe = Column(Boolean)


class OhlcvDaily(Base):
    __tablename__ = "ohlcv_daily"
    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    open = Column(Integer)
    high = Column(Integer)
    low = Column(Integer)
    close = Column(Integer)
    volume = Column(Integer)
