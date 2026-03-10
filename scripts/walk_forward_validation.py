"""
Session C2: Walk-Forward Validation + Feature Selection + Time-Weighted Training
- 6개월 학습 → 1개월 테스트 롤링 윈도우
- Importance 기반 피처 순차 제거 (15~30개 탐색)
- Exponential decay 시간 가중치
- Before(B2) vs After(C2) 비교
"""
from __future__ import annotations

import logging
import sys
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from scipy import stats
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
    XGBOOST_OK = True
except ImportError:
    XGBOOST_OK = False

try:
    from sklearn.ensemble import RandomForestRegressor
    RF_OK = True
except ImportError:
    RF_OK = False

warnings.filterwarnings("ignore", category=FutureWarning)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── 경로 ──
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BEFORE_ROOT = PROJECT_ROOT / "before" / "ranking_backtest"
DATA_DIR = BEFORE_ROOT / "runtime" / "data" / "cal_data"
CONFIG_DIR = BEFORE_ROOT / "configs"
OUTPUT_DIR = PROJECT_ROOT / "runtime" / "c2_validation"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Data Loading
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def load_panel() -> pd.DataFrame:
    """panel_merged_daily.parquet 로드 + forward return 계산"""
    path = DATA_DIR / "panel_merged_daily.parquet"
    if not path.exists():
        raise FileNotFoundError(f"패널 없음: {path}")
    df = pd.read_parquet(path)
    df["date"] = pd.to_datetime(df["date"])
    df["ticker"] = df["ticker"].astype(str).str.zfill(6)
    df = df.sort_values(["ticker", "date"]).reset_index(drop=True)

    # forward return 계산
    for horizon in [20, 120]:
        col = f"ret_fwd_{horizon}d"
        if col not in df.columns:
            px = "close" if "close" in df.columns else "adj_close"
            fwd = df.groupby("ticker")[px].shift(-horizon)
            cur = df[px].where(df[px] != 0)
            df[col] = fwd / cur - 1.0

    # excess return (시장 중립)
    for horizon in [20, 120]:
        col = f"ret_fwd_{horizon}d"
        ex_col = f"{col}_excess"
        if ex_col not in df.columns:
            if "in_universe" in df.columns:
                mkt = df[df["in_universe"] == True].groupby("date")[col].mean()
            else:
                mkt = df.groupby("date")[col].mean()
            df[ex_col] = df[col] - df["date"].map(mkt)

    log.info(f"패널 로드: {len(df):,} rows × {len(df.columns)} cols")
    return df


def load_feature_list(horizon: int) -> list[str]:
    """YAML 피처 리스트 로드"""
    fname = "features_short_v1.yaml" if horizon == 20 else "features_long_v1.yaml"
    path = CONFIG_DIR / fname
    with open(path, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return cfg.get("features", [])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Walk-Forward Folds
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def generate_wf_folds(
    dates: pd.DatetimeIndex,
    train_months: int = 6,
    test_days: int = 20,
    step_days: int = 20,
    embargo_days: int = 20,
    horizon_days: int = 20,
    holdout_years: int = 2,
) -> pd.DataFrame:
    """6개월 학습 → 1개월 테스트 롤링 윈도우 생성"""
    dates = dates.sort_values()
    overall_end = dates[-1]
    holdout_threshold = overall_end - pd.DateOffset(years=holdout_years)

    folds = []
    pos = 0

    while pos < len(dates):
        test_start_pos = pos
        test_end_pos = min(pos + test_days - 1, len(dates) - 1)

        if test_end_pos >= len(dates):
            break

        # train_end = test_start - embargo - horizon
        train_end_pos = test_start_pos - embargo_days - horizon_days - 1
        if train_end_pos < 0:
            pos += step_days
            continue

        train_end = dates[train_end_pos]
        train_start = train_end - pd.DateOffset(months=train_months)
        train_start_pos = int(dates.searchsorted(train_start, side="left"))

        # 최소 학습 데이터 확보
        if train_end_pos - train_start_pos < 60:
            pos += step_days
            continue

        test_start = dates[test_start_pos]
        test_end = dates[test_end_pos]

        segment = "holdout" if test_start >= holdout_threshold else "dev"

        folds.append({
            "fold_id": f"{segment}_{len([f for f in folds if f['segment'] == segment]) + 1:04d}",
            "segment": segment,
            "train_start": dates[train_start_pos],
            "train_end": train_end,
            "test_start": test_start,
            "test_end": test_end,
            "n_train_days": train_end_pos - train_start_pos + 1,
        })

        pos += step_days

    result = pd.DataFrame(folds)
    n_dev = (result["segment"] == "dev").sum()
    n_ho = (result["segment"] == "holdout").sum()
    log.info(f"WF 폴드: {len(result)}개 (dev={n_dev}, holdout={n_ho})")
    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Metrics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def rank_ic(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    s1 = pd.Series(y_true).rank(pct=True)
    s2 = pd.Series(y_pred).rank(pct=True)
    v = float(s1.corr(s2))
    return 0.0 if np.isnan(v) else v


def calc_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    err = y_pred - y_true
    ic = rank_ic(y_true, y_pred)
    hit = float(np.mean(np.sign(y_true) == np.sign(y_pred)))
    rmse = float(np.sqrt(np.mean(err**2)))
    return {"ic_rank": ic, "hit_ratio": hit, "rmse": rmse}


def ic_to_sharpe(ic_series: pd.Series) -> float:
    """IC 평균 / IC 표준편차 → Information Ratio (≈ Sharpe proxy)"""
    if len(ic_series) < 2 or ic_series.std() == 0:
        return 0.0
    return float(ic_series.mean() / ic_series.std())


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Model Building
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def build_ridge(alpha: float = 0.01) -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", Ridge(alpha=alpha)),
    ])


def build_xgboost(
    max_depth: int = 3,
    min_child_weight: int = 10,
    reg_alpha: float = 0.1,
    n_estimators: int = 600,
    learning_rate: float = 0.05,
) -> Pipeline:
    if not XGBOOST_OK:
        raise ImportError("xgboost 필요")
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", XGBRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=1.0,
            reg_alpha=reg_alpha,
            min_child_weight=min_child_weight,
            objective="reg:squarederror",
            n_jobs=-1,
            random_state=42,
            verbosity=0,
        )),
    ])


def build_rf(n_estimators: int = 100, max_depth: int = 5) -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            n_jobs=-1,
        )),
    ])


def build_ensemble_models() -> dict:
    return {
        "xgboost": build_xgboost(),
        "ridge": build_ridge(),
        "rf": build_rf(),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Time Decay Weights
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def compute_time_weights(dates: pd.Series, decay_lambda: float = 1.0) -> np.ndarray:
    """Exponential decay: w_i = exp(-lambda * (T_max - T_i) / 252)"""
    d = pd.to_datetime(dates)
    t_max = d.max()
    days_ago = (t_max - d).dt.days.values.astype(np.float64)
    weights = np.exp(-decay_lambda * days_ago / 252.0)
    # 정규화: 합=len
    weights = weights * len(weights) / weights.sum()
    return weights.astype(np.float32)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. Single Fold Training
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def train_fold(
    df: pd.DataFrame,
    fold: dict,
    feature_cols: list[str],
    target_col: str,
    model_builder,
    use_time_decay: bool = False,
    decay_lambda: float = 1.0,
    ensemble_weights: dict | None = None,
) -> dict | None:
    """단일 폴드 학습 + 평가. 앙상블 모드 지원."""
    train_mask = (df["date"] >= fold["train_start"]) & (df["date"] <= fold["train_end"])
    test_mask = (df["date"] >= fold["test_start"]) & (df["date"] <= fold["test_end"])

    dtrain = df[train_mask].dropna(subset=[target_col])
    dtest = df[test_mask].dropna(subset=[target_col])

    if len(dtrain) < 2000 or len(dtest) < 200:
        return None

    # 사용 가능 피처
    use_cols = [c for c in feature_cols if c in df.columns and dtrain[c].notna().any()]
    if len(use_cols) < 5:
        return None

    X_train = dtrain[use_cols].values.astype(np.float32)
    X_test = dtest[use_cols].values.astype(np.float32)

    # cs_rank 타겟 변환
    y_train = dtrain.groupby("date")[target_col].rank(pct=True).values - 0.5
    y_test_metric = dtest.groupby("date")[target_col].rank(pct=True).values - 0.5
    y_train = y_train.astype(np.float32)
    y_test_metric = y_test_metric.astype(np.float32)

    # 시간 가중치
    sample_weight = None
    if use_time_decay:
        sample_weight = compute_time_weights(dtrain["date"], decay_lambda)

    # 앙상블 모드
    if ensemble_weights is not None:
        models = model_builder()
        y_pred = np.zeros(len(dtest), dtype=np.float32)
        total_w = 0
        importances = {}

        for name, model in models.items():
            w = ensemble_weights.get(name, 0)
            if w <= 0:
                continue
            fit_params = {}
            # XGBoost sample_weight
            if use_time_decay and sample_weight is not None and "xgboost" in name.lower():
                fit_params["model__sample_weight"] = sample_weight
            model.fit(X_train, y_train, **fit_params)
            pred = model.predict(X_test).astype(np.float32)
            y_pred += w * pred
            total_w += w

            # feature importance 추출
            base = model.named_steps["model"]
            if hasattr(base, "feature_importances_"):
                importances[name] = dict(zip(use_cols, base.feature_importances_.tolist()))
            elif hasattr(base, "coef_"):
                importances[name] = dict(zip(use_cols, np.abs(base.coef_).tolist()))

        if total_w > 0:
            y_pred /= total_w
        else:
            return None
    else:
        # 단일 모델
        model = model_builder()
        fit_params = {}
        if use_time_decay and sample_weight is not None:
            # XGBoost는 sample_weight, Ridge는 지원 안 함
            if hasattr(model.named_steps.get("model", None), "fit"):
                m = model.named_steps["model"]
                if isinstance(m, XGBRegressor):
                    fit_params["model__sample_weight"] = sample_weight
        model.fit(X_train, y_train, **fit_params)
        y_pred = model.predict(X_test).astype(np.float32)

        importances = {}
        base = model.named_steps["model"]
        if hasattr(base, "feature_importances_"):
            importances["main"] = dict(zip(use_cols, base.feature_importances_.tolist()))
        elif hasattr(base, "coef_"):
            importances["main"] = dict(zip(use_cols, np.abs(base.coef_).tolist()))

    # train IC (과적합 모니터링)
    if ensemble_weights is not None:
        # 앙상블: 간이 train IC
        y_train_pred = np.zeros(len(dtrain), dtype=np.float32)
        total_w2 = 0
        for name, model in models.items():
            w = ensemble_weights.get(name, 0)
            if w <= 0:
                continue
            y_train_pred += w * model.predict(X_train).astype(np.float32)
            total_w2 += w
        if total_w2 > 0:
            y_train_pred /= total_w2
    else:
        y_train_pred = model.predict(X_train).astype(np.float32)

    train_ic = rank_ic(y_train, y_train_pred)
    test_metrics = calc_metrics(y_test_metric, y_pred)

    return {
        "fold_id": fold["fold_id"],
        "segment": fold["segment"],
        "train_start": str(fold["train_start"].date()),
        "train_end": str(fold["train_end"].date()),
        "test_start": str(fold["test_start"].date()),
        "test_end": str(fold["test_end"].date()),
        "n_train": len(dtrain),
        "n_test": len(dtest),
        "n_features": len(use_cols),
        "train_ic": train_ic,
        "test_ic": test_metrics["ic_rank"],
        "ic_gap": train_ic - test_metrics["ic_rank"],
        "hit_ratio": test_metrics["hit_ratio"],
        "rmse": test_metrics["rmse"],
        "importances": importances,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. Experiments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def run_experiment(
    df: pd.DataFrame,
    folds_df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str,
    model_builder,
    label: str,
    use_time_decay: bool = False,
    decay_lambda: float = 1.0,
    ensemble_weights: dict | None = None,
) -> pd.DataFrame:
    """전체 폴드에 대해 실험 실행"""
    results = []
    for _, fold in folds_df.iterrows():
        r = train_fold(
            df, fold, feature_cols, target_col,
            model_builder=model_builder,
            use_time_decay=use_time_decay,
            decay_lambda=decay_lambda,
            ensemble_weights=ensemble_weights,
        )
        if r is not None:
            r["experiment"] = label
            results.append(r)

    if not results:
        log.warning(f"  [{label}] 유효 폴드 없음")
        return pd.DataFrame()

    rdf = pd.DataFrame(results)
    # 요약
    for seg in ["dev", "holdout"]:
        sub = rdf[rdf["segment"] == seg]
        if len(sub) > 0:
            ic_mean = sub["test_ic"].mean()
            ic_std = sub["test_ic"].std()
            ir = ic_mean / ic_std if ic_std > 0 else 0
            gap = sub["ic_gap"].mean()
            hit = sub["hit_ratio"].mean()
            log.info(
                f"  [{label}] {seg}: IC={ic_mean:.4f}±{ic_std:.4f}, "
                f"IR={ir:.3f}, gap={gap:.4f}, hit={hit:.3f} ({len(sub)} folds)"
            )
    return rdf


def aggregate_importances(results_df: pd.DataFrame) -> pd.DataFrame:
    """폴드별 feature importance 집계"""
    imp_records = []
    for _, row in results_df.iterrows():
        imps = row.get("importances", {})
        if not imps:
            continue
        for model_name, feat_imp in imps.items():
            for feat, val in feat_imp.items():
                imp_records.append({
                    "fold_id": row["fold_id"],
                    "model": model_name,
                    "feature": feat,
                    "importance": val,
                })
    if not imp_records:
        return pd.DataFrame()
    idf = pd.DataFrame(imp_records)
    agg = idf.groupby("feature")["importance"].agg(["mean", "std", "count"]).reset_index()
    agg = agg.sort_values("mean", ascending=False).reset_index(drop=True)
    agg.columns = ["feature", "imp_mean", "imp_std", "n_folds"]
    return agg


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. Feature Selection (순차 제거)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def run_feature_selection(
    df: pd.DataFrame,
    folds_df: pd.DataFrame,
    all_features: list[str],
    target_col: str,
    model_builder,
    test_counts: list[int] = None,
    ensemble_weights: dict | None = None,
) -> pd.DataFrame:
    """Importance 기반 피처 수 탐색 (15~30개)"""
    if test_counts is None:
        test_counts = [15, 18, 20, 22, 25, 28, len(all_features)]

    # holdout 폴드만 사용 (속도 최적화)
    ho_folds = folds_df[folds_df["segment"] == "holdout"].copy()
    if ho_folds.empty:
        ho_folds = folds_df
    log.info(f"[Feature Selection] {len(ho_folds)} holdout 폴드로 importance 계산 중...")
    full_result = run_experiment(
        df, ho_folds, all_features, target_col,
        model_builder=model_builder,
        label="fs_full",
        ensemble_weights=ensemble_weights,
    )
    if full_result.empty:
        log.warning("전체 피처 실험 실패")
        return pd.DataFrame()

    imp_df = aggregate_importances(full_result)
    if imp_df.empty:
        log.warning("importance 추출 실패")
        return pd.DataFrame()

    ranked_features = imp_df["feature"].tolist()
    log.info(f"[Feature Selection] Top 10: {ranked_features[:10]}")

    # 각 피처 수로 실험 (holdout 폴드만)
    selection_results = []
    for n in sorted(set(test_counts)):
        if n > len(ranked_features):
            n = len(ranked_features)
        subset = ranked_features[:n]
        rdf = run_experiment(
            df, ho_folds, subset, target_col,
            model_builder=model_builder,
            label=f"fs_{n}feat",
            ensemble_weights=ensemble_weights,
        )
        if rdf.empty:
            continue

        for seg in ["dev", "holdout"]:
            sub = rdf[rdf["segment"] == seg]
            if len(sub) > 0:
                selection_results.append({
                    "n_features": n,
                    "segment": seg,
                    "ic_mean": sub["test_ic"].mean(),
                    "ic_std": sub["test_ic"].std(),
                    "ir": sub["test_ic"].mean() / sub["test_ic"].std() if sub["test_ic"].std() > 0 else 0,
                    "ic_gap": sub["ic_gap"].mean(),
                    "hit_ratio": sub["hit_ratio"].mean(),
                    "n_folds": len(sub),
                })

    sel_df = pd.DataFrame(selection_results)
    if not sel_df.empty:
        log.info("\n[Feature Selection 결과]")
        log.info(sel_df.to_string(index=False))
    return sel_df


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 9. Time Decay Experiments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def run_time_decay_experiments(
    df: pd.DataFrame,
    folds_df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str,
    lambdas: list[float] = None,
) -> pd.DataFrame:
    """Exponential decay lambda 탐색"""
    if lambdas is None:
        lambdas = [0.0, 0.5, 1.0, 2.0, 3.0]

    decay_results = []
    for lam in lambdas:
        label = f"decay_λ={lam:.1f}"
        rdf = run_experiment(
            df, folds_df, feature_cols, target_col,
            model_builder=build_xgboost,
            label=label,
            use_time_decay=(lam > 0),
            decay_lambda=lam,
        )
        if rdf.empty:
            continue
        for seg in ["dev", "holdout"]:
            sub = rdf[rdf["segment"] == seg]
            if len(sub) > 0:
                decay_results.append({
                    "lambda": lam,
                    "segment": seg,
                    "ic_mean": sub["test_ic"].mean(),
                    "ic_std": sub["test_ic"].std(),
                    "ir": sub["test_ic"].mean() / sub["test_ic"].std() if sub["test_ic"].std() > 0 else 0,
                    "ic_gap": sub["ic_gap"].mean(),
                    "hit_ratio": sub["hit_ratio"].mean(),
                    "n_folds": len(sub),
                })

    td_df = pd.DataFrame(decay_results)
    if not td_df.empty:
        log.info("\n[Time Decay 결과]")
        log.info(td_df.to_string(index=False))
    return td_df


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 10. Main
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _save_intermediate(rdf: pd.DataFrame, name: str):
    """중간 결과 저장 (crash 방지)"""
    if isinstance(rdf, pd.DataFrame) and not rdf.empty:
        save_cols = [c for c in rdf.columns if c != "importances"]
        rdf[save_cols].to_csv(OUTPUT_DIR / f"{name}.csv", index=False)


def main():
    log.info("=" * 60)
    log.info("Session C2: Walk-Forward Validation 시작")
    log.info("=" * 60)

    # 데이터 로드
    df = load_panel()
    dates = pd.DatetimeIndex(df["date"].unique()).sort_values()

    # 앙상블 가중치 (track_a_final_config에서)
    ens_weights_short = {"xgboost": 0.50, "ridge": 0.30, "rf": 0.10}
    ens_weights_long = {"xgboost": 0.65, "ridge": 0.20, "rf": 0.10}

    all_results = {}

    for horizon in [20, 120]:
        target_col = f"ret_fwd_{horizon}d_excess"
        features = load_feature_list(horizon)
        available = [f for f in features if f in df.columns]
        ens_w = ens_weights_short if horizon == 20 else ens_weights_long

        log.info(f"\n{'='*60}")
        log.info(f"Horizon={horizon}d | 피처={len(available)}/{len(features)} | 타겟={target_col}")
        log.info(f"{'='*60}")

        # WF 폴드 생성
        folds = generate_wf_folds(
            dates,
            train_months=6 if horizon == 20 else 12,
            test_days=20,
            step_days=20,
            embargo_days=20,
            horizon_days=horizon,
        )
        if folds.empty:
            log.warning(f"Horizon {horizon}: 폴드 없음, 스킵")
            continue

        # ── Exp 1: Baseline (Ridge only, 현재 시스템) ──
        log.info("\n[Exp 1] Baseline: Ridge only")
        r1 = run_experiment(
            df, folds, available, target_col,
            model_builder=build_ridge, label=f"h{horizon}_ridge",
        )
        _save_intermediate(r1, f"h{horizon}_ridge")

        # ── Exp 2: XGBoost standalone ──
        log.info("\n[Exp 2] XGBoost standalone")
        r2 = run_experiment(
            df, folds, available, target_col,
            model_builder=build_xgboost, label=f"h{horizon}_xgb",
        )
        _save_intermediate(r2, f"h{horizon}_xgb")

        # ── Exp 3: Ensemble (XGB+Ridge+RF) ──
        log.info("\n[Exp 3] Ensemble (XGB+Ridge+RF)")
        r3 = run_experiment(
            df, folds, available, target_col,
            model_builder=build_ensemble_models, label=f"h{horizon}_ensemble",
            ensemble_weights=ens_w,
        )
        _save_intermediate(r3, f"h{horizon}_ensemble")

        # ── Exp 4: XGBoost + Time Decay (λ=1.0만 — H20에서 최적 확인됨) ──
        log.info("\n[Exp 4] Time Decay (XGBoost)")
        lambdas = [0.0, 0.5, 1.0, 2.0, 3.0] if horizon == 20 else [0.0, 1.0, 3.0]
        td_df = run_time_decay_experiments(
            df, folds, available, target_col,
            lambdas=lambdas,
        )

        # ── Exp 5: Feature Selection ──
        log.info("\n[Exp 5] Feature Selection")
        fs_df = run_feature_selection(
            df, folds, available, target_col,
            model_builder=build_xgboost,
            test_counts=[15, 18, 20, 22, 25, len(available)],
        )

        # 결과 저장
        prefix = f"h{horizon}"
        all_results[f"{prefix}_folds"] = folds
        for label, rdf in [("ridge", r1), ("xgb", r2), ("ensemble", r3)]:
            if not rdf.empty:
                all_results[f"{prefix}_{label}"] = rdf
        if not td_df.empty:
            all_results[f"{prefix}_time_decay"] = td_df
        if not fs_df.empty:
            all_results[f"{prefix}_feature_selection"] = fs_df

        # importance 집계
        if not r2.empty:
            imp = aggregate_importances(r2)
            if not imp.empty:
                all_results[f"{prefix}_importance"] = imp
                imp.to_csv(OUTPUT_DIR / f"{prefix}_feature_importance.csv", index=False)

    # ── 최종 리포트 ──
    log.info("\n" + "=" * 60)
    log.info("최종 비교 테이블")
    log.info("=" * 60)

    summary_rows = []
    for key, rdf in all_results.items():
        if not isinstance(rdf, pd.DataFrame) or "test_ic" not in rdf.columns:
            continue
        for seg in ["dev", "holdout"]:
            sub = rdf[rdf["segment"] == seg]
            if len(sub) == 0:
                continue
            ic_s = sub["test_ic"]
            summary_rows.append({
                "experiment": key,
                "segment": seg,
                "ic_mean": round(ic_s.mean(), 4),
                "ic_std": round(ic_s.std(), 4),
                "IR": round(ic_s.mean() / ic_s.std(), 3) if ic_s.std() > 0 else 0,
                "ic_gap": round(sub["ic_gap"].mean(), 4),
                "hit_ratio": round(sub["hit_ratio"].mean(), 3),
                "n_folds": len(sub),
            })

    if summary_rows:
        summary = pd.DataFrame(summary_rows)
        log.info("\n" + summary.to_string(index=False))
        summary.to_csv(OUTPUT_DIR / "c2_summary.csv", index=False)
        log.info(f"\n결과 저장: {OUTPUT_DIR}/")

    # 개별 결과 저장
    for key, rdf in all_results.items():
        if isinstance(rdf, pd.DataFrame):
            # importances 컬럼은 직렬화 불가 → 제거
            save_cols = [c for c in rdf.columns if c != "importances"]
            rdf[save_cols].to_csv(OUTPUT_DIR / f"{key}.csv", index=False)

    log.info("\nSession C2 Walk-Forward Validation 완료!")
    return all_results


if __name__ == "__main__":
    main()
