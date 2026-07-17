# 热榜—股价关系观察台

> 在同一交易日轴上观察热榜原始名次与股价、沪深300之间的同期关系。

## 定位

用于回答“某只股票的热榜名次如何变化、同期价格如何变化、两者在历史上是否经常同向”。页面只描述同期关系，不推断因果或未来表现。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“热榜—股价关系观察台”数据观测看板。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 将个股热榜排名、股票前复权日 K 与沪深300按同一交易日历对齐。
2. 默认展示所选股票的排名—价格双轨，排名纵轴反转并保留原始名次；下轨展示股票与基准的指数化价格。
3. 用逐日散点展示“昨日排名－今日排名”与当日相对收益，显示同期 Spearman 相关、样本数和跃升事件。
4. 明确 Top30 历史榜与个股完整排名走势的差异；日榜不与小时榜价格混用。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 页面定位为数据观察与视觉穿透，不添加组合评价或交易执行模块。
```

## 效果预览

[![热榜—股价关系观察台](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/a-share/special-data/hot-stock-list-history`
- `GET /api/a-share/special-data/hot-stock-rank-trend`
- `GET /api/a-share/special-data/hot-stock-list`
- `GET /api/a-share/prices/historical`
- `GET /api/a-share-index/prices/historical`

## 关键边界

- Top30 缺席与个股完整排名走势需分开标记。
- 热榜是注意力代理变量，不等于资金流、基本面或买入意愿。
- 同期相关和事件分布不能证明热度导致价格变化。
- 实时热度字段不倒填历史，历史不可用时不得补假线。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
