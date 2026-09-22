# hithink-finance CLI 入口

CLI 是人类终端、Agent 执行与自动化的推荐路径，统一远端数据、本地 DuckDB、认证、稳定 JSON 信封和大结果落盘。

## 先判断处于哪种状态

1. 检查 PATH 中是否存在 `hithink-finance`，存在时读取 `hithink-finance version --format json`。
2. 未安装、版本异常、需要配置认证、检查内置 Skills、诊断、升级或卸载时，读取 [安装、配置与生命周期](cli/setup.md)。
3. **已经安装且确定使用 CLI 完成金融任务时，不要把本入口当成功能契约。**先运行：

   ```bash
   hithink-finance skills status --format json
   hithink-finance capabilities --format json
   ```

   `skills status` 同时报告包内官方来源 `canonical`、保存策略、共享内容和逐目标文件验证。读取 [CLI 内置 Skills 路由](cli/builtin-skills.md)，从 `canonical` 打开对应版本的 Skill 及 references；`ready` 只表示文件验证通过，不能证明当前 Agent 已发现或加载这些目录。

4. 当前 Agent 的 Skills 目录缺少配套内容且保存策略允许同步时，按 setup 契约运行 `hithink-finance skills sync --agent <当前 Agent> --format json`，再用 `status` 复查。只追加当前目标，不扩展到全部客户端。未知 Agent、目录冲突或会话不能刷新时，直接读取可用的 `canonical` 内容完成当前任务，保留原目录与用户保存策略；仅在官方内容也无法读取时回退到 MCP 或 REST。`capabilities`、`schema <command-id>` 和 `<command> --help` 用于核对命令，不作为客户端发现 Skill 的证明。

## 长时间本地初始化

`data init` 的远端全量路径包含下载、导入和复权重建；下载完成不表示进程已完成或 DuckDB 已解锁。

- 使用前台、可等待全部子进程的执行器，超时不少于 15 分钟；不要让外层 shell 超时后遗留 `node.exe`。
- 只有退出码 0 且 JSON 信封 `ok=true` 后，才可对同一 `--db` 运行 `data status`、`market history`、`db query` 或其他本地命令。
- 若执行器超时或返回非 0，先检查锁文件/报错中的存活 PID。PID 仍存活时继续等待，不得在该 DB 上继续执行，也不得删除活锁；只有用户明确要求取消时才终止该进程。

## 功能简述

- `symbol`：标的搜索与代码表。
- `market`：行情、公司行为、交易日历和本地面板。
- `financials`：三张财务报表与财务指标。
- `valuation`：A 股最新估值快照。
- `index`：指数/板块目录、成分和行情。
- `fund`：基金资料、净值、持仓、ETF/LOF 快照与 ETF 历史日线。
- `special`：涨停、异动、热榜与龙虎榜。
- `futures`：期货品种、合约、持仓、仓单、基差、交易日程和行情。
- `options`：期权品种、合约和行情。
- `data` / `db`：本地数据初始化、同步、校验、修复、查询与导出。
- `auth` / `skills` / `doctor` / `update` / `uninstall`：安装后配置和生命周期。

机器读取显式使用 `--format json`。成功条件是进程退出码 0 且信封 `ok=true`；不要按上游 `code=0` 解析 CLI 输出。只有具体命令声明的 `--output` 才能落盘，它不是全局选项。

`data validate` 的外层成功表示检查已执行，质量通过还要求 `data.ok=true`；样本和时间覆盖需独立核验。严格只读研究按配套 research Skill 的前置流程先确认文件存在和迁移计划为空，再执行质量检查。`data status` 可创建缺失数据库，`data validate` 和 `db describe` 会应用普通迁移。
