CREATE TABLE IF NOT EXISTS _meta (
  key VARCHAR PRIMARY KEY,
  value VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS _import_batches (
  batch_id VARCHAR PRIMARY KEY,
  source VARCHAR NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR NOT NULL,
  row_count BIGINT,
  content_hash VARCHAR,
  error_code VARCHAR
);

CREATE TABLE IF NOT EXISTS raw_kline_daily (
  thscode VARCHAR NOT NULL,
  date DATE NOT NULL,
  open DOUBLE NOT NULL,
  high DOUBLE NOT NULL,
  low DOUBLE NOT NULL,
  close DOUBLE NOT NULL,
  prev_close DOUBLE,
  volume DOUBLE NOT NULL,
  amount DOUBLE NOT NULL,
  batch_id VARCHAR,
  PRIMARY KEY (thscode, date)
);

CREATE TABLE IF NOT EXISTS raw_adjustment_events (
  thscode VARCHAR NOT NULL,
  ex_date DATE NOT NULL,
  dividend_per_share DOUBLE NOT NULL DEFAULT 0,
  per_share_bonus DOUBLE NOT NULL DEFAULT 0,
  rights_ratio DOUBLE NOT NULL DEFAULT 0,
  rights_price DOUBLE,
  batch_id VARCHAR,
  PRIMARY KEY (thscode, ex_date)
);

CREATE TABLE IF NOT EXISTS dim_symbol (
  thscode VARCHAR PRIMARY KEY,
  ticker VARCHAR,
  name VARCHAR,
  exchange VARCHAR,
  asset_type VARCHAR NOT NULL DEFAULT 'a-share',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calc_adjust_factor_daily (
  thscode VARCHAR NOT NULL,
  date DATE NOT NULL,
  forward_factor DOUBLE NOT NULL,
  backward_factor DOUBLE NOT NULL,
  PRIMARY KEY (thscode, date)
);

CREATE TABLE IF NOT EXISTS stg_kline_daily AS SELECT * FROM raw_kline_daily WHERE FALSE;
CREATE TABLE IF NOT EXISTS stg_adjustment_events AS SELECT * FROM raw_adjustment_events WHERE FALSE;
CREATE TABLE IF NOT EXISTS stg_symbol AS SELECT * FROM dim_symbol WHERE FALSE;

CREATE OR REPLACE VIEW v_symbol AS
SELECT thscode, ticker, name, exchange, asset_type, updated_at
FROM dim_symbol;

CREATE OR REPLACE VIEW v_daily AS
SELECT thscode, date, open, high, low, close, prev_close, volume, amount
FROM raw_kline_daily;

CREATE OR REPLACE VIEW v_daily_qfq AS
SELECT
  d.thscode,
  d.date,
  d.open * COALESCE(f.forward_factor, 1) AS open,
  d.high * COALESCE(f.forward_factor, 1) AS high,
  d.low * COALESCE(f.forward_factor, 1) AS low,
  d.close * COALESCE(f.forward_factor, 1) AS close,
  d.volume,
  d.amount
FROM raw_kline_daily d
LEFT JOIN calc_adjust_factor_daily f USING (thscode, date);

CREATE OR REPLACE VIEW v_daily_hfq AS
SELECT
  d.thscode,
  d.date,
  d.open * COALESCE(f.backward_factor, 1) AS open,
  d.high * COALESCE(f.backward_factor, 1) AS high,
  d.low * COALESCE(f.backward_factor, 1) AS low,
  d.close * COALESCE(f.backward_factor, 1) AS close,
  d.volume,
  d.amount
FROM raw_kline_daily d
LEFT JOIN calc_adjust_factor_daily f USING (thscode, date);
