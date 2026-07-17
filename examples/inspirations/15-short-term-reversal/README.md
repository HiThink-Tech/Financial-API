# 短期反转回测实验室

> 用分组、Rank IC、市场状态和成本检验短期反转证据。

## 定位

选择过去5日相对基准跌幅最深但长期趋势未破坏的股票，验证均值回归。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“短期反转回测实验室”回测工作台。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 通过平台登录态获取全市场日 K 与复权事件 dump 的短时效下载链接，构造复权后的全市场面板；通过指数历史 K 线端点获取沪深300基准，并按交易日内连接。
2. 计算过去5日相对基准收益，过滤流动性、MA120与异常单日跌幅，选择底部10%。
3. T日收盘选股，T+1开盘买入，固定持有5日并执行5日冷却；费用和滑点为用户给定假设。
4. 输出净值回撤、完整绩效、十分组、Rank IC、市场状态与形成期×持有期敏感性。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 参数修改需显示未应用状态；运行后输出收益、风险、风险调整、稳定性、交易成本和策略专属诊断。
```

## 效果预览

[![短期反转回测实验室](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /dump/market-dumps/daily-k/download-url`
- `GET /dump/market-dumps/adjustment-factors/download-url`
- `GET /api/a-share-index/prices/historical`
- `GET /api/meta/tickers/list?asset_type=a-share`

## 关键边界

- 反转因子与未来收益的Rank IC预期为负。
- 若样本长期呈正IC，必须标记“样本更偏动量，反转证据不足”。
- 两个 dump 下载端点使用平台登录态返回短时效预签名链接，并受 capability 权限控制；必须应用复权事件后才能计算横截面收益。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
