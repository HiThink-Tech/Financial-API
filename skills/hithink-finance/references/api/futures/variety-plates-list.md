# 期货品种板块

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

期货合约扩展资料提供品种板块、主连、主力、次主力和商品指数等客户端内能力

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="futures-variety-plates"></a>
## 期货品种板块

```text
GET /api/futures/variety-plates/list
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/futures/variety-plates/list'
```

### 响应示例

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

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 品种板块列表；每项含可空的 `variety_code`、`name`、`plate_level`、`plate_name`。 |
