-- Stable consumer-facing views. Rebuild after schema or calc changes.

CREATE OR REPLACE VIEW v_symbol AS
SELECT
    thscode,
    ticker,
    name,
    exchange,
    asset_type,
    currency
FROM dim_symbol;

CREATE OR REPLACE VIEW v_daily AS
SELECT
    k.thscode,
    k.date,
    k.open,
    k.high,
    k.low,
    k.close,
    k.volume,
    k.turnover,
    k.currency,
    k.interval
FROM raw_kline_daily k;

CREATE OR REPLACE VIEW v_daily_qfq AS
SELECT
    k.thscode,
    k.date,
    k.open  * COALESCE(f.forward_factor, 1.0) AS open,
    k.high  * COALESCE(f.forward_factor, 1.0) AS high,
    k.low   * COALESCE(f.forward_factor, 1.0) AS low,
    k.close * COALESCE(f.forward_factor, 1.0) AS close,
    k.volume,
    k.turnover,
    COALESCE(f.forward_factor, 1.0) AS forward_factor,
    k.currency,
    k.interval
FROM raw_kline_daily k
LEFT JOIN calc_adjust_factor_daily f
    ON f.thscode = k.thscode AND f.date = k.date;

CREATE OR REPLACE VIEW v_daily_hfq AS
SELECT
    k.thscode,
    k.date,
    k.open  * COALESCE(f.backward_factor, 1.0) AS open,
    k.high  * COALESCE(f.backward_factor, 1.0) AS high,
    k.low   * COALESCE(f.backward_factor, 1.0) AS low,
    k.close * COALESCE(f.backward_factor, 1.0) AS close,
    k.volume,
    k.turnover,
    COALESCE(f.backward_factor, 1.0) AS backward_factor,
    k.currency,
    k.interval
FROM raw_kline_daily k
LEFT JOIN calc_adjust_factor_daily f
    ON f.thscode = k.thscode AND f.date = k.date;
