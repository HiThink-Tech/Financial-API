# 期货F10宏观指标历史数据

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

期货 F10 宏观指标历史数据提供指定宏观指标在日期范围内的历史观测值。

- 指标列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

> **tip 指标字典**
> 从 <a href="/futures-f10-indicators.md" target="_blank" rel="noopener noreferrer">期货 F10 历史指标字典 ↗</a> 选择指标 ID，并以英文逗号分隔后传入 `indicator_ids`。该静态 Markdown 文件可直接打开或另存下载。

```text
GET /api/futures/fundamentals/indicators-historical
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `indicator_ids` | string | 是 | — | 1～5 个逗号分隔的指标 ID。 |
| `start_date` | string | 是 | — | 开始日期，格式 `yyyy-MM-dd`。 |
| `end_date` | string | 是 | — | 结束日期，不早于开始日期，区间最长 5 年。 |

## 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/futures/fundamentals/indicators-historical?indicator_ids=2825232,2825233&start_date=2026-01-01&end_date=2026-09-01'
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
        "indicator_id": "2825232",
        "observations": [
          {
            "date": "2026-08-28",
            "value": 50
          }
        ]
      }
    ]
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 指标列表；每项含可空 `indicator_id` 与非空 `observations[]`。 |
| `observations[].date` / `value` | string \| null / number \| null | 观察日期与数值。 |
