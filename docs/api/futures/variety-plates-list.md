# 期货品种板块

[业务导航](README.md)

期货品种板块提供品种与板块层级的对应关系。

- 接口返回统一 `ApiResponse` 信封；Unix 时间戳为毫秒。
- 金融数值来源缺失时可为 `null`，合法无数据返回空数组。

```text
GET /api/futures/variety-plates/list
```

## 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/variety-plates/list' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "variety_code": "CU",
        "name": "沪铜",
        "plate_level": 1,
        "plate_name": "有色金属"
      }
    ]
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 品种板块列表；每项含可空的 `variety_code`、`name`、`plate_level`、`plate_name`。 |
