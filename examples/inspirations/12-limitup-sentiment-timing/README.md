# 涨停情绪市场脉冲屏

> 同步观察涨停、连板梯队、封单留存和涨停原因分布。

## 定位

用于盘后复盘市场情绪结构和板位迁徙。页面提供观察状态，不给出仓位或买卖动作。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“涨停情绪市场脉冲屏”数据观测看板。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 从涨停池的 `pagination.total`、`continue_day_cnt`、`limit_up_time`、`seal_money` 和 `max_seal_money` 计算涨停数、连板数、最高板、早封率和封单留存；接口不提供炸板池，不得生成炸板数量。
2. 使用近30日连板天梯绘制板位×日期矩阵；晋级率只能在天梯返回的有限样本内按股票代码匹配估算，并标明不是全市场晋级率。
3. 联动连板层级变化、封单结构和 `limit_up_reason` 原因分布；接口不提供行业字段，不得把涨停原因改写成行业分布。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 页面定位为数据观察与视觉穿透，不添加组合评价或交易执行模块。
```

## 效果预览

[![涨停情绪市场脉冲屏](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/a-share/special-data/limit-up-pool`
- `GET /api/a-share/special-data/limit-up-ladder`
- `GET /api/a-share-index/prices/historical`

## 关键边界

- 连板天梯每个板位只有有限覆盖，不等于全市场涨停总数。
- 涨停池不含炸板记录和行业字段；页面只能展示涨停池、原因分布及天梯有限样本。
- 未知格用缺失状态表达，不将缺失当作0。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
