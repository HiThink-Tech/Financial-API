-- marketdb schema v1.0.0
-- Raw layer mirrors Parquet/API dumps verbatim. Calc layer holds recomputable
-- derivations. v_* layer is the stable interface for SDK / notebooks / backtests.

CREATE TABLE IF NOT EXISTS _meta (
    key VARCHAR PRIMARY KEY,
    value VARCHAR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS _import_batches (
    batch_id VARCHAR PRIMARY KEY,
    source VARCHAR NOT NULL,           -- parquet | rest | mcp
    kind VARCHAR NOT NULL,             -- kline_daily | adjustment_events | symbols | snapshot
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    row_count BIGINT,
    notes VARCHAR
);

CREATE TABLE IF NOT EXISTS raw_kline_daily (
    thscode VARCHAR NOT NULL,
    date DATE NOT NULL,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume DOUBLE,
    turnover DOUBLE,
    currency VARCHAR,
    interval VARCHAR,
    adjusted VARCHAR,
    source_batch_id VARCHAR,
    PRIMARY KEY (thscode, date)
);

CREATE TABLE IF NOT EXISTS raw_adjustment_events (
    thscode VARCHAR NOT NULL,
    ticker VARCHAR,
    ex_date DATE NOT NULL,
    dividend_per_share DOUBLE,
    per_share_bonus DOUBLE,
    allotment_ratio DOUBLE,
    allotment_price DOUBLE,
    currency VARCHAR,
    source_batch_id VARCHAR,
    PRIMARY KEY (thscode, ex_date)
);

CREATE TABLE IF NOT EXISTS dim_symbol (
    thscode VARCHAR PRIMARY KEY,
    ticker VARCHAR,
    name VARCHAR,
    exchange VARCHAR,
    asset_type VARCHAR,
    currency VARCHAR,
    source_batch_id VARCHAR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calc_adjust_factor_daily (
    thscode VARCHAR NOT NULL,
    date DATE NOT NULL,
    forward_factor DOUBLE NOT NULL,
    backward_factor DOUBLE NOT NULL,
    factor_version VARCHAR,
    source_event_batch_id VARCHAR,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thscode, date)
);

-- Staging tables: drop+create per batch.
CREATE TABLE IF NOT EXISTS stg_kline_daily (
    thscode VARCHAR,
    date DATE,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume DOUBLE,
    turnover DOUBLE,
    currency VARCHAR,
    interval VARCHAR,
    adjusted VARCHAR,
    source_batch_id VARCHAR
);

CREATE TABLE IF NOT EXISTS stg_adjustment_events (
    thscode VARCHAR,
    ticker VARCHAR,
    ex_date DATE,
    dividend_per_share DOUBLE,
    per_share_bonus DOUBLE,
    allotment_ratio DOUBLE,
    allotment_price DOUBLE,
    currency VARCHAR,
    source_batch_id VARCHAR
);

CREATE TABLE IF NOT EXISTS stg_symbols (
    thscode VARCHAR,
    ticker VARCHAR,
    name VARCHAR,
    exchange VARCHAR,
    asset_type VARCHAR,
    currency VARCHAR,
    source_batch_id VARCHAR
);
