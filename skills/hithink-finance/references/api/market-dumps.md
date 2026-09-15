# 全市场数据导出（Market Dumps）

> 一次性获取全市场 Parquet 格式的日K和复权事件数据。适合批量回测、离线分析、自建数据仓库。**不要用逐只 `prices-historical` 拉全市场**——全市场约 5000+ 只票，逐只调需数千次 HTTP 请求，用本端点 3 次请求即可完成。

## 端点概览（3 个）

| 端点 | dump 类型 | 内容 | 规模 | 用途 |
|------|-----------|------|------|------|
| `GET /api/dump/market-dumps/daily-k/download-url` | `daily-k` | 全市场 10 年日K（未复权） | ~945 万行 | 首次全量 |
| `GET /api/dump/market-dumps/daily-k-10d/download-url` | `daily-k-10d` | 全市场最近 10 交易日 | ~25 万行 | 日常增量 |
| `GET /api/dump/market-dumps/adjustment-factors/download-url` | `adjustment-factors` | 全市场复权事件（分红/送股/配股） | ~5.2 万行 | 复权计算 |

## 通用流程（3 步）

```
1. GET 签名端点 → 获取 S3 预签名下载 URL
2. GET 预签名 URL → 下载 Parquet 文件到本地
3. 用 pandas/pyarrow/DuckDB 读取 Parquet 文件
```

⚠️ **预签名 URL 有效期只有约 5 分钟**，拿到立刻下载，不要缓存 URL。

---

## 1. 全市场 10 年日K

```text
GET /api/dump/market-dumps/daily-k/download-url
```

返回全 A 股最近约 10 年的日K Parquet 文件下载链接。数据为**原始未复权**价格。

### 请求参数

无请求参数。认证仅通过 Header。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/dump/market-dumps/daily-k/download-url' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 0=成功。2002/2004=认证失败。4040=数据尚未就绪。5xxx=服务端错误。 |
| `message` | string | 错误信息（code≠0 时） |
| `data.presigned_url` | string | S3 预签名下载链接，有效期约 5 分钟 |
| `data.presigned_url_expires_at` | string | URL 过期时间（ISO 8601 UTC） |

### 完整下载流程

```bash
# Step 1: 签出 URL
DOWNLOAD_URL=$(curl -s 'https://fuyao.aicubes.cn/api/dump/market-dumps/daily-k/download-url' \
  -H 'X-api-key: <your-api-key>' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['presigned_url'])")

# Step 2: 下载 Parquet（大文件，可能需要几分钟）
curl -L -o /tmp/a_share_daily_k_full.parquet "$DOWNLOAD_URL"

# Step 3: 验证
python3 -c "import pandas as pd; df=pd.read_parquet('/tmp/a_share_daily_k_full.parquet'); print(f'rows={len(df)}, cols={list(df.columns)}')"
```

### Parquet Schema（日K）

| 列名 | 类型 | 说明 |
|------|------|------|
| `thscode` | string | 带交易所后缀的完整代码，如 `600519.SH` |
| `currency` | string | 币种代码，A 股固定为 `CNY` |
| `interval` | string | 周期代码，固定为 `1d` |
| `adjusted` | string | 复权方式，固定为 `none`（未复权） |
| `date_ms` | long | K 线日期（毫秒，Asia/Shanghai 零点） |
| `open_price` | number | 开盘价（原始货币） |
| `high_price` | number | 最高价（原始货币） |
| `low_price` | number | 最低价（原始货币） |
| `close_price` | number | 收盘价（原始货币） |
| `volume` | number | 成交量（股） |
| `turnover` | number | 成交额（原始货币） |

---

## 2. 全市场近 10 交易日日K

```text
GET /api/dump/market-dumps/daily-k-10d/download-url
```

与全量日K共用同一 Parquet Schema，仅数据范围缩小为最近 10 个交易日。适合每天增量同步。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/dump/market-dumps/daily-k-10d/download-url' \
  -H 'X-api-key: <your-api-key>'
```

### 避错要点

- 本地数据落后 >7 个交易日时，`daily-k-10d` 不能完全覆盖缺口，应改用 `daily-k`（全量）重新拉。
- 增量 Parquet 内的日期可能与本地数据重叠，建议入库时按 `(thscode, date_ms)` 去重或 UPSERT。

---

## 3. 全市场复权因子事件

```text
GET /api/dump/market-dumps/adjustment-factors/download-url
```

返回全 A 股全部历史的复权事件（现金分红、送股、配股）。调用方可用这些事件自行推算日频复权因子。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/dump/market-dumps/adjustment-factors/download-url' \
  -H 'X-api-key: <your-api-key>'
```

### Parquet Schema（复权因子）

| 列名 | 类型 | 说明 |
|------|------|------|
| `thscode` | string | 带交易所后缀的完整代码 |
| `ticker` | string | 展示用代码 |
| `ex_date_ms` | long | 除权除息日（毫秒，Asia/Shanghai 零点） |
| `dividend_per_share` | number | 每股现金分红（税前） |
| `per_share_bonus` | number | 每股送股比例 |
| `allotment_ratio` | number | 配股比例 |
| `allotment_price` | number | 配股价格（原始货币） |
| `currency` | string | 币种代码，A 股固定为 `CNY` |

---

## 避错要点

| 错误 | 正确处理 |
|------|----------|
| 预签名 URL 过期（HTTP 403） | 重新调签名端点获取新 URL，再下载 |
| 想用 JSON 格式拿全市场 | 本端点只出 Parquet。需要 JSON 的逐只数据用 `/api/a-share/prices/historical` |
| 把 dump 端点当成返回 JSON 数据的 REST 端点 | 它只返回签名 URL，实际数据需通过第二步 GET 预签名 URL 获取 |
| 复权因子用逐只 `corporate-actions` 端点拉全市场 | 也是 ~5000 次请求，应该用 `adjustment-factors` dump |
| `daily-k-10d` 的 Parquet 增量入库时未去重 | 按 `(thscode, date_ms)` UPSERT，避免主键冲突 |
| 预签名 URL 存下来跨天用 | 重新签名，不要存 URL |
