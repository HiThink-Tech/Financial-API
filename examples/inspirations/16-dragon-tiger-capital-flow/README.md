# 龙虎榜资金流向拓扑台

> 把跨交易日龙虎榜净额聚合为概念轨迹，并穿透到机构、游资和股票。

## 定位

与第08个单日榜单观察不同，本页用于分析近N个交易日资金在概念之间的迁徙和贡献证据。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“龙虎榜资金流向拓扑台”数据观测看板。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 先调用 `GET /api/a-share/calendar/trading-days` 取得近一年交易日，再逐日调用龙虎榜端点读取全部榜、机构榜或游资榜；默认只纳入 `range_days=1`，避免1日榜与3日榜重复。
2. 一只股票有多个概念时按概念数等分净额，保证概念聚合总额守恒。
3. 生成概念累计净额轨迹、端点防碰撞标签、资金路径和股票正负贡献联动。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 页面定位为数据观察与视觉穿透，不添加组合评价或交易执行模块。
```

## 效果预览

[![龙虎榜资金流向拓扑台](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/a-share/special-data/dragon-tiger-list?board_type=all&date=YYYY-MM-DD`
- `GET /api/a-share/special-data/dragon-tiger-list?board_type=org&date=YYYY-MM-DD`
- `GET /api/a-share/special-data/dragon-tiger-list?board_type=hot_money&date=YYYY-MM-DD`
- `GET /api/a-share/calendar/trading-days`

## 关键边界

- 龙虎榜接口是交易日级收盘榜单，不提供09:31–15:00分钟时间戳。
- 页面不得把日级数据伪装成盘中分时；非交易日和空数组必须如实显示。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
