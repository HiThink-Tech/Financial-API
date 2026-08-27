# Changelog

## Unreleased

- 将 Market Dump 的 SHA-256 校验改为流式计算，并为 DuckDB 设置保守的默认内存与线程预算。
- 后台更新检查增加跨进程租约，前台生命周期子进程增加超时和跨平台进程树终止。
- stdin 与本地 DuckDB 查询支持取消；限制凭据和批量代码输入大小，并保持导入提交后的一致性收尾。
- 隔离生命周期子进程诊断输出，保持结构化 stdout 可解析。
- 收紧远端重试范围和等待上限，并为网络、下载和数据任务增加信号取消。
- 增加结构化数据锁错误、脱敏调试信息、内部错误报告链接和显式配置文件校验。
- 扩充 `doctor`、校正 Skills 状态/修复语义，并扩大线上 canary 的业务域覆盖。
- 弃用命令行明文 API Key，补齐中文帮助、`--no-color` 和终端可点击错误报告链接。

## 0.1.5 - 2026-08-17

- 新增集合竞价快照、竞价短期基准、跌停池和炸板池命令。
- 新增 21 个基金公司、经理、业绩、财务、资讯、发行与历史持仓命令。
- 远端能力契约总数由 31 更新为 56；同步公开 REST/MCP 与 Python toolkit 契约。
- 修正竞价响应时间与默认日期、基金资讯 `has_more` 游标终止条件，以及历史业绩指标响应载体说明。

## 0.1.4 - 2026-07-24

- 新增 `valuation snapshot` 命令，用于批量查询 A 股当前估值快照。
- 新增 `hithink-finance-valuation` Agent Skill，能力契约总数更新为 31。
- 估值代码输入按服务契约校验原始 token 上限，统一大写并保持首次出现顺序去重。

## 0.1.3 - 2026-07-20

- `fund holders` 新增 `--merge-scope all|merged|separate`，默认 `all`；同步持有人披露口径和报告日契约。

## 0.1.2 - 2026-07-17

- 新增基金档案、持仓、净值、收益、持有人、场内快照和 ETF 历史 7 个远端命令。
- 标的搜索和列表支持基金资产类型及逗号分隔多值过滤。
- 随包 Agent Skills 增加 `hithink-finance-fund`，能力契约总数同步更新。

## 0.1.1 - 2026-07-13

- 优化统一 API Key 配置体验，支持跨接入方式复用凭据。
- 远程数据初始化和同步增加下载进度提示，保持结构化 stdout 输出稳定。
- 提升 CLI 跨平台测试兼容性。

## 0.1.0

- Initial TypeScript CLI with hithink finance REST capabilities, DuckDB data engine, Agent Skills, and lifecycle commands.
