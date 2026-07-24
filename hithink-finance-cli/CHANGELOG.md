# Changelog

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
