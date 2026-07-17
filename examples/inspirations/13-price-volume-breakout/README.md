# 价格成交量突破回测台

> 解释突破如何形成、如何成交、为何退出，并完整评估表现。

## 定位

使用全市场日 K 验证“价格新高 + 成交量确认 + 趋势过滤”的多股票组合。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“价格成交量突破回测台”回测工作台。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 通过平台登录态获取全市场日 K 与复权事件 dump 的短时效下载链接，下载后按主键去重，并用复权事件构造一致的回测价格序列；沪深300基准通过指数历史 K 线端点获取。
2. 构造前55日高点（排除当天）、20日退出低点、量比和MA60过滤。
3. T日收盘产生信号，T+1开盘按用户给定的滑点和费用假设成交；日 K 只能近似涨跌停成交约束，不能声称掌握盘口成交。
4. 输出净值、回撤、完整指标、逐笔交易、假突破、事件K线和参数敏感性。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 参数修改需显示未应用状态；运行后输出收益、风险、风险调整、稳定性、交易成本和策略专属诊断。
```

## 效果预览

[![价格成交量突破回测台](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /dump/market-dumps/daily-k/download-url`
- `GET /dump/market-dumps/daily-k-10d/download-url`
- `GET /dump/market-dumps/adjustment-factors/download-url`
- `GET /api/a-share/prices/historical`
- `GET /api/a-share-index/prices/historical`
- `GET /api/meta/tickers/list?asset_type=a-share`

## 关键边界

- 全市场 dump 为未复权，必须使用复权事件或候选股票前复权行情。
- 三个 dump 下载端点使用平台登录态返回短时效预签名链接，并受 capability 权限控制；仅配置 API Key 不等于具备下载权限。
- 必须测试除权除息前后不会产生虚假突破。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
