# 自选股当日异动监控

> 把自选股快照与今日异动原因组合成可排序、可筛选的轻量监控页。

## 定位

快速查看自选股中哪些标的出现当日异动，以及接口返回的事实性原因。默认观察同花顺、贵州茅台和平安银行。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，通过 REST API 为"同花顺、贵州茅台、平安银行"生成一张"自选股当日异动监控"看板；不假设本地存在项目仓库。

### 数据任务

1. 按统一凭据规则读取 API Key，使用 `GET /api/meta/tickers/search` 逐一消歧并去重，最多保留 20 只 A 股；不得猜交易所后缀。
2. 用 `GET /api/a-share/prices/snapshot` 批量获取行情，再用 `GET /api/a-share/special-data/anomaly-analysis-stock` 查询这些代码的当日异动原因。检查 HTTP 状态和业务信封 `code=0`。
3. 按代码关联行情与异动记录。未返回异动只表示当前接口没有匹配记录，不能解释为股票没有任何市场事件。

### 页面产物

- 直接生成当前目录下的 `watchlist-anomalies.html` 并打开预览。
- 必须是无外部依赖、无运行时请求的单文件 HTML。页面应具备现代金融数据产品的专业感和清晰信息层级，具体布局、配色和视觉风格自由发挥。
- 支持按涨跌幅/成交额排序、搜索以及"仅看有异动"筛选；展示最新价、涨跌幅、日内区间、成交额和接口原因，点击标的可联动详情，空异动状态也要清晰可读。
- 标明行情时间、today-only 边界、数据源和"非投资建议"。不得把 API Key 或完整原始响应写入产物。
```

## 效果预览

[![自选股当日异动监控](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/meta/tickers/search`
- `GET /api/a-share/prices/snapshot`
- `GET /api/a-share/special-data/anomaly-analysis-stock`

## 关键边界

- 推荐路径：REST API。
- 数据范围：最多 20 只 A 股；异动原因仅覆盖接口当前交易日。
- 前置条件：仅需安装 Skill 并配置统一凭据；无需仓库、CLI 或 Python SDK。
- 未返回异动只表示当前接口没有匹配记录，不能解释为股票没有任何市场事件。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
