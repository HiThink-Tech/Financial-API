# 同花顺指数列表

[业务导航](README.md)

指数数据域，承载同花顺指数列表浏览、成分股清单、指数行情快照与历史 K 线。
典型调用顺序：先用 catalog 或 meta 拿到目标指数的 `thscode`，再按场景取成分股、快照或历史 K 线。

- `thscode` 入参均会被 `trim().toUpperCase()` 标准化，**不接受逗号**，单次仅支持一个指数。
- 指数行情覆盖上证交易所指数（如 `000001.SH`）、深证交易所指数（如 `399001.SZ`）、同花顺板块（如 `886042.TI`）与同花顺行业指数（如 `881101.TI`）。

## 同花顺指数列表

```text
GET /api/a-share-index/catalog/ths-index-list
```

按 `tag`（概念 / 区域 / 特色 / 行业）列出同花顺指数清单，单 `tag` 一次性全量返回，
无分页参数。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `tag` | query | string | 否 | 标签白名单：`cn_concept`(A 股概念) / `region`(区域指数) / `tszs`(特色指数) / `industry`(行业指数)。大小写不敏感。 | `cn_concept` |

### 请求示例

```bash
# 拉取全部概念板块
curl 'https://fuyao.aicubes.cn/api/a-share-index/catalog/ths-index-list?tag=cn_concept' \
  -H 'X-api-key: <your-api-key>'

# 拉取全部同花顺行业指数
curl 'https://fuyao.aicubes.cn/api/a-share-index/catalog/ths-index-list?tag=industry' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "e5f6g7h8",
  "data": {
    "timestamp": 1748102400000,
    "item": [
      {
        "thscode": "886042.TI",
        "name": "白酒概念"
      },
      {
        "thscode": "886041.TI",
        "name": "新能源车"
      }
    ]
  }
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间戳（毫秒）。 |
| `item[].thscode` | string | 同花顺指数的完整 thscode，如 `886042.TI`。 |
| `item[].name` | string | 同花顺指数展示名称。 |

> 指数维度不暴露纯代码 `ticker`。
