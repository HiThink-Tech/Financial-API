# 指数与板块端点

> 同花顺指数 / 板块的目录、成分股、行情快照与历史 K 线。参数定义、响应字段以本文档为准。

## 通用说明

- 指数 `thscode` 支持同花顺后缀（`.TI`，如 `886042.TI`）和标准交易所后缀（`.SH` / `.SZ`，如 `000300.SH`）。
- 指数端点**没有**复权概念，`adjust` 参数不适用。
- 指数快照**不支持**全市场模式，必须显式传 `thscodes`。

---

## 1. 同花顺指数列表

```text
GET /api/a-share-index/catalog/ths-index-list
```

按类别列出同花顺概念、区域、特色或行业指数清单。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `tag` | query | string | 否 | 指数类别，枚举 `cn_concept` / `region` / `tszs` / `industry`（大小写不敏感）。 | `cn_concept` |

> 单个 `tag` 全量返回，无分页。返回可能较大，应落盘或只保留目标匹配项。

### 请求示例

```bash
# 概念板块列表
curl 'https://fuyao.aicubes.cn/api/a-share-index/catalog/ths-index-list?tag=cn_concept' \
  -H 'X-api-key: <your-api-key>'

# 行业指数列表
curl 'https://fuyao.aicubes.cn/api/a-share-index/catalog/ths-index-list?tag=industry' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 指数列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 指数 thscode，如 `886042.TI`。 |
| `name` | string | 指数名称。 |

> 指数维度不暴露纯 `ticker`。

---

## 2. 指数成分股

```text
GET /api/a-share-index/constituents/ths-stock-list
```

查询单个 THS 板块或标准指数的当前成分股。**单次一个 `thscode`**，不接受逗号。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单个指数 thscode。支持 `886042.TI`（同花顺板块）或 `000300.SH`（沪深 300 等标准指数）。 | — |

### 请求示例

```bash
# 沪深 300 成分股
curl 'https://fuyao.aicubes.cn/api/a-share-index/constituents/ths-stock-list?thscode=000300.SH' \
  -H 'X-api-key: <your-api-key>'

# 某概念板块成分股
curl 'https://fuyao.aicubes.cn/api/a-share-index/constituents/ths-stock-list?thscode=886042.TI' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 成分股列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 成分股 thscode，如 `600519.SH`。 |
| `ticker` | string | 纯代码，如 `600519`。 |
| `name` | string | 成分股名称。 |

### 避错要点

- 逗号分隔多个指数：端点仅接受单个 `thscode`。
- 把结果当历史成分：返回的是当前成分，不提供历史调入调出序列。

---

## 3. 指数行情快照

```text
GET /api/a-share-index/prices/snapshot
```

批量查询有限数量指数 / 板块的最新行情。**必须传 `thscodes`**，不支持全市场模式。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscodes` | query | string | 是 | 逗号分隔的指数 thscode 列表。支持 `.SH` / `.SZ` / `.TI`。 | — |
| `limit` | query | integer | 否 | 仅为签名兼容，**无实际效果**。 | — |
| `offset` | query | integer | 否 | 仅为签名兼容，**无实际效果**。 | — |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share-index/prices/snapshot?thscodes=000300.SH,000001.SH' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `SnapshotData`，`item[]` 为 `PriceSnapshotItem`，字段结构与 [A 股行情快照](endpoints-prices.md#1-行情快照) 的 `PriceSnapshotItem` 一致。

### 避错要点

- 省略 `thscodes` 期望全量：指数快照**不支持**全市场模式，空输入会被拒绝。
- 把股票代码交给指数端点：股票代码应使用 `/api/a-share/prices/snapshot`。

---

## 4. 指数历史 K 线

```text
GET /api/a-share-index/prices/historical
```

获取单只指数 / 板块的历史日 K 线。**单次一个 `thscode`**，窗口 ≤ 10 年。指数无复权概念。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只指数 thscode，**不接受逗号**。 | — |
| `interval` | query | string | 是 | K 线周期，固定为 `1d`（日线）。 | `1d` |
| `start` | query | long | 是 | 起始时间（毫秒）。`end - start` > 10 年返回 `code=1003`。 | — |
| `end` | query | long | 是 | 结束时间（毫秒）。 | — |

> 无 `adjust`、无 `offset` — 指数没有复权语义；响应 `data.adjust` 恒为 `null`，不代表数据缺失。

### 请求示例

```bash
# 沪深 300 近一年日 K
curl 'https://fuyao.aicubes.cn/api/a-share-index/prices/historical?thscode=000300.SH&interval=1d&start=1716105600000&end=1747641600000' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `HistoricalData`，`item[]` 为 `PriceBarItem`，字段结构与 [A 股历史 K 线](endpoints-prices.md#2-历史-k-线) 的 `PriceBarItem` 一致。

### 避错要点

- 传 `adjust` 参数：指数无复权概念，传 `adjust` 无意义。
- 一次传多个指数：端点仅接受单个 `thscode`。
