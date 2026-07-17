# 时间序列动量回测台

> 把资产 Active/Inactive、现金状态与组合表现放进同一状态机。

## 定位

判断每个资产自身动量是否为正，选择有效资产；全部失效时明确持有现金。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“时间序列动量回测台”回测工作台。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 通过同花顺指数目录或指数代码表确定一个明确资产池；逐个调用指数历史 K 线端点，使用相同交易日区间和 `interval=1d` 对齐 OHLC 数据。
2. 计算120日自身动量、MA120状态和60日波动率；周频/月频信号由日 K 在本地重采样，支持等权/逆波动率。
3. T日收盘计算状态，T+1开盘执行；无Active资产时现金比例为100%。
4. 输出净值回撤、完整绩效、状态泳道、风险贡献和窗口敏感性。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 参数修改需显示未应用状态；运行后输出收益、风险、风险调整、稳定性、交易成本和策略专属诊断。
```

## 效果预览

[![时间序列动量回测台](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/a-share-index/catalog/ths-index-list`
- `GET /api/a-share-index/prices/historical`
- `GET /api/meta/tickers/list?asset_type=a-share-index`

## 关键边界

- 一次运行只允许一个明确资产池。
- 现金状态是策略结果，不得误判为行情缺失。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
