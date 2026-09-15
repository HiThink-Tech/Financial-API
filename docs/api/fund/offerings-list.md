# 基金募集列表

[业务导航](README.md)

- 接口返回统一 `ApiResponse` 信封；日期时间字段统一使用文档标注的格式，毫秒时间戳按 `Asia/Shanghai` 解释。
- `subscribe` 只接受 `active`（当前募集）或 `upcoming`（即将募集）。

```text
GET /api/fund/offerings/list
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `subscribe` | enum | 是 | — | `active`（当前募集）或 `upcoming`（即将募集）。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/offerings/list?subscribe=active' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "78ae6cdd0e384175a669dcf11a36a4da",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "025480.OF",
        "ticker": "025480",
        "subscription_start_ms": 1786579200000,
        "subscription_end_ms": 1787184000000
      }
    ]
  }
}
```

## 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 完整基金 thscode。 |
| `ticker` | string | 纯基金代码。 |
| `subscription_start_ms` | long | 募集开始时间，毫秒 Unix 时间戳。 |
| `subscription_end_ms` | long | 募集结束时间，毫秒 Unix 时间戳。 |

通用鉴权与错误码参见[基金 API 总览](README.md)。
