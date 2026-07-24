# 更新日志

本文件记录“同花顺金融数据服务（hithink finance）”对外可见的重要变化。版本升级与路径兼容说明见 [Monorepo 版本升级指南](docs/monorepo-migration.md)。

## 2026-07-24 — A 股估值快照能力

- 新增批量 A 股当前估值快照，返回市盈率 TTM/MRQ、市净率 MRQ、市销率 TTM 和市现率 TTM。
- REST API、MCP、CLI、Python SDK 与统一 Agent Skill 同步支持估值能力。

## 2026-07-17 — 公募基金能力

- 新增基金资料、定期披露持仓、净值、区间收益和持有人结构查询。
- 新增 ETF/LOF 行情快照与 ETF 历史日线，明确 5 年窗口和基金类型边界。
- REST API、MCP、CLI、Python SDK 与统一 Agent Skill 同步支持基金能力；meta 标的检索扩展基金资产类型。

## 2026-07-10 — Monorepo 文档与接入体系治理

### 新增

- 新增 `hithink-finance` Node.js CLI，统一远端数据、本地 DuckDB、机器可读输出、诊断、更新与卸载流程。
- 新增统一的 `hithink-finance` Agent Skill，自动探测当前环境，并在 REST API、MCP、CLI 与 Python SDK 之间路由。
- 新增根目录 `CHANGELOG.md`，集中承载项目版本与能力演进历史。

### 变更

- 项目品牌由“同花顺金融数据 API / fuyao Financial”统一升级为“同花顺金融数据服务 / hithink finance”。
- 仓库升级为 monorepo；Python 项目根迁入 `python/`，CLI 位于 `hithink-finance-cli/`。
- 上游 REST API 与 MCP 契约收敛到 `docs/`，通过脚本镜像到可独立安装的 Skill，避免多份契约漂移。
- README 重构为项目总览，并补充 npm 优先的 CLI、三端点 MCP、Python SDK、统一 API Key 与示例入口。

### 迁移提醒

- 旧版 checkout、editable 安装、脚本、CI 和 Agent Prompt 必须按 [`docs/monorepo-migration.md`](docs/monorepo-migration.md) 调整。
- 仓库不再保存 `llms.txt` / `llms-full.txt` 副本；官网用户仍可访问 <https://fuyao.aicubes.cn/llms-full.txt>。

## 2026-07-06 — MCP Agent Skill

- 新增 Fuyao Financial MCP 配套 Agent Skill。
- 配置 MCP 后可由 Skill 辅助认证检查、自然语言能力路由、参数避错和工具 Wiki 定位；调用参数以当前连接暴露的 `tools/list` 为准。

## 2026-07-02 — 热榜与龙虎榜能力

- 同步飙升榜、热股榜、历史热股榜、热股排名趋势和龙虎榜能力。
- Fuyao toolkit 扩展为 23 个 REST 端点、22 个 MCP 工具，补齐 client/CLI、参数校验、离线契约测试与文档。

## 2026-07-01 — 灵感示例

- 新增“灵感”金融看板示例板块。
- 提供单股行情与趋势速览的 Prompt、预览图和静态 HTML，建立可浏览、可复制 Prompt、可继续扩展的示例入口。

## 2026-07-01 — 财务指标与当日异动

- 同步 API Server 新增的财务指标与当日个股异动能力，补充 3 个 REST client/CLI 命令，并登记其中 2 个 MCP 工具。
- Fuyao toolkit 扩展为 18 个 REST 端点、17 个 MCP 工具，补齐参数校验、当日快照边界、REST-only/MCP 暴露差异和离线契约测试。

## 2026-06-23 — marketdb 自动构建与增量同步

- `marketdb` 改用“自动下载 dump + 增量合并”，替代手工准备 Parquet 和 REST 逐标的拉取。
- 新增 `auto-sync` CLI、`bootstrap.py` 双轨入口、`release_tag` 幂等、跨平台缓存与清理，以及 API Key 缺失/鉴权失败指引。
- 首次构建简化为配置 `API_KEY` 后运行 `python bootstrap.py`；后续可用 `marketdb auto-sync` 增量更新，并自动刷新复权事件，避免 `v_daily_qfq` 漂移。
