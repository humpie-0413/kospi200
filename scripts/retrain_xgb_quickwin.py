"""Quick Win B2: XGBoost 재학습 + 새 feature weight YAML 생성"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'before', 'ranking_backtest'))

import numpy as np
import pandas as pd
import yaml
from pathlib import Path
from datetime import datetime
from scipy.stats import spearmanr
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parent.parent
CAL = ROOT / 'before' / 'ranking_backtest' / 'runtime' / 'data' / 'cal_data'
CFG_DIR = ROOT / 'before' / 'ranking_backtest' / 'configs'

# Quick Win hyperparameters
XGB_PARAMS = dict(
    n_estimators=600,
    max_depth=3,           # 6→3 (과적합 완화)
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_lambda=1.0,
    reg_alpha=0.1,         # 0→0.1 (L1 정규화)
    min_child_weight=10,   # 1→10 (과적합 완화)
    objective='reg:squarederror',
    n_jobs=-1,
    random_state=42,
)

# Feature lists (MACD_signal 제거됨)
FEATURES_LONG = [
    'volatility_60d', 'volatility_20d', 'volatility',
    'momentum_rank', 'downside_volatility_60d', 'price_momentum_60d',
    'price_momentum', 'momentum_6m', 'max_drawdown_60d', 'turnover',
    'net_income', 'roe', 'total_liabilities', 'debt_ratio',
    'esg_score', 'environmental_score', 'social_score', 'governance_score',
    'news_sentiment_ewm20',
    'RSI_14', 'bollinger_pctb',  # MACD_signal 제거
]

FEATURES_SHORT = [
    'volatility_60d', 'volatility_20d',
    'momentum_rank', 'downside_volatility_60d', 'price_momentum_60d',
    'price_momentum', 'momentum_6m', 'max_drawdown_60d', 'turnover',
    'net_income', 'roe',
    'momentum_3m', 'momentum_reversal', 'ret_daily', 'volume_ratio', 'equity',
    'news_sentiment', 'news_sentiment_ewm5', 'news_sentiment_surprise', 'news_volume',
    'RSI_14', 'bollinger_pctb',  # MACD_signal 제거
]

def cs_rank(series):
    """Cross-sectional rank (0~1)"""
    return series.rank(pct=True)

def train_and_save(panel, features, horizon, side):
    """Train XGBoost and save feature weights YAML"""
    target = f'fwd_ret_{horizon}'

    # Forward returns
    panel = panel.sort_values(['ticker', 'date'])
    panel[target] = panel.groupby('ticker')['close'].transform(
        lambda x: x.shift(-horizon) / x - 1
    )

    # Filter usable rows
    cols = [c for c in features if c in panel.columns]
    df = panel[panel['in_universe'] == True][['date', 'ticker'] + cols + [target]].dropna()

    # CS rank target
    df['target_rank'] = df.groupby('date')[target].transform(cs_rank) - 0.5

    # Train/test split: last 20% by date
    dates = sorted(df['date'].unique())
    split_idx = int(len(dates) * 0.8)
    train_dates = dates[:split_idx]
    test_dates = dates[split_idx:]

    train = df[df['date'].isin(train_dates)]
    test = df[df['date'].isin(test_dates)]

    X_train = train[cols].values.astype(np.float32)
    y_train = train['target_rank'].values.astype(np.float32)
    X_test = test[cols].values.astype(np.float32)
    y_test = test['target_rank'].values.astype(np.float32)

    # Replace NaN/Inf
    X_train = np.nan_to_num(X_train, nan=0.0, posinf=0.0, neginf=0.0)
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=0.0, neginf=0.0)

    print(f"\n{'='*60}")
    print(f"[{side.upper()}] h{horizon}: train={len(train):,}, test={len(test):,}, features={len(cols)}")

    # Train
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(X_train, y_train)

    # Evaluate
    pred_train = model.predict(X_train)
    pred_test = model.predict(X_test)

    # IC by date (train)
    train_ics = []
    for d in train_dates:
        mask = train['date'].values == d
        if mask.sum() >= 30:
            ic, _ = spearmanr(pred_train[mask], y_train[mask])
            if not np.isnan(ic):
                train_ics.append(ic)

    # IC by date (test)
    test_ics = []
    for d in test_dates:
        mask = test['date'].values == d
        if mask.sum() >= 30:
            ic, _ = spearmanr(pred_test[mask], y_test[mask])
            if not np.isnan(ic):
                test_ics.append(ic)

    train_ic = np.mean(train_ics) if train_ics else 0
    test_ic = np.mean(test_ics) if test_ics else 0
    train_hit = np.mean([1 if ic > 0 else 0 for ic in train_ics]) if train_ics else 0
    test_hit = np.mean([1 if ic > 0 else 0 for ic in test_ics]) if test_ics else 0

    print(f"  Train IC: {train_ic:.4f} (hit={train_hit:.1%})")
    print(f"  Test  IC: {test_ic:.4f} (hit={test_hit:.1%})")
    print(f"  IC Gap  : {train_ic - test_ic:.4f}")

    # Feature importance
    importances = model.feature_importances_
    feat_weights = {col: float(imp) for col, imp in zip(cols, importances)}

    # Sort by importance
    sorted_feats = sorted(feat_weights.items(), key=lambda x: x[1], reverse=True)
    print(f"\n  Feature Importance Top 10:")
    for i, (f, w) in enumerate(sorted_feats[:10]):
        print(f"    {i+1}. {f}: {w:.4f}")

    # Features with importance < 0.01
    low_feats = [(f, w) for f, w in sorted_feats if w < 0.01]
    if low_feats:
        print(f"\n  Low importance (<0.01): {[f for f,w in low_feats]}")

    # Save YAML
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    yaml_data = {
        'description': f'[Session B2 Quick Win] XGBoost 재학습 (max_depth=3, min_child_weight=10, reg_alpha=0.1)',
        'horizon': side,
        'hyperparameters': {k: v for k, v in XGB_PARAMS.items() if k != 'objective'},
        'metadata': {
            'dev_ic_mean': float(train_ic),
            'dev_hit_ratio': float(train_hit),
            'dev_icir': float(np.mean(train_ics) / np.std(train_ics)) if train_ics and np.std(train_ics) > 0 else 0,
            'holdout_ic_mean': float(test_ic),
            'holdout_hit_ratio': float(test_hit),
            'holdout_icir': float(np.mean(test_ics) / np.std(test_ics)) if test_ics and np.std(test_ics) > 0 else 0,
            'optimization_date': ts,
            'feature_count': len(cols),
            'non_zero_feature_count': sum(1 for w in importances if w > 0),
            'train_dates': f'{train_dates[0]} ~ {train_dates[-1]}',
            'test_dates': f'{test_dates[0]} ~ {test_dates[-1]}',
        },
        'feature_weights': feat_weights,
    }

    fname = f'feature_weights_{side}_xgboost_{ts}.yaml'
    fpath = CFG_DIR / fname
    with open(fpath, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_data, f, default_flow_style=False, allow_unicode=True)

    print(f"\n  Saved: {fpath.name}")
    return fname, train_ic, test_ic, train_hit, test_hit, feat_weights


def main():
    print("Loading panel...")
    panel = pd.read_parquet(CAL / 'panel_merged_daily.parquet')
    print(f"Panel: {panel.shape[0]:,} rows x {panel.shape[1]} cols")

    results = {}

    # Long (h120)
    fname_long, *metrics_long = train_and_save(panel.copy(), FEATURES_LONG, 120, 'long')
    results['long'] = {'file': fname_long, 'metrics': metrics_long}

    # Short (h20)
    fname_short, *metrics_short = train_and_save(panel.copy(), FEATURES_SHORT, 20, 'short')
    results['short'] = {'file': fname_short, 'metrics': metrics_short}

    print(f"\n{'='*60}")
    print("Summary:")
    print(f"  Long  weight file: {fname_long}")
    print(f"  Short weight file: {fname_short}")

    # Update config.yaml
    print("\nUpdating config.yaml...")
    cfg_path = CFG_DIR / 'config.yaml'
    with open(cfg_path, encoding='utf-8') as f:
        cfg_text = f.read()

    # Load as YAML to update specific fields
    with open(cfg_path, encoding='utf-8') as f:
        cfg = yaml.safe_load(f)

    # Update XGBoost hyperparams in l5
    cfg['l5']['xgb_max_depth'] = 3
    cfg['l5']['xgb_min_child_weight'] = 10
    cfg['l5']['xgb_reg_alpha'] = 0.1

    # Update ensemble weights - Long
    cfg['track_a_final_config']['ensemble_weights']['long'] = {
        'xgboost': 0.65,
        'ridge': 0.20,
        'rf': 0.10,
        'grid': 0.05,
    }

    # Update feature weight file references
    cfg['track_a_final_config']['feature_weights_files']['xgboost_long'] = f'configs/{fname_long}'
    cfg['track_a_final_config']['feature_weights_files']['xgboost_short'] = f'configs/{fname_short}'

    with open(cfg_path, 'w', encoding='utf-8') as f:
        yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=True)

    print("  config.yaml updated (l5 params + ensemble weights + weight files)")

    return results


if __name__ == '__main__':
    results = main()
