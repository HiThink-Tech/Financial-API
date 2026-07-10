# hithink-finance CLI 入口

CLI 是人类终端、Agent 执行与自动化的推荐路径，统一远端数据、本地 DuckDB、认证、稳定 JSON 信封和大结果落盘。

## 先判断处于哪种状态

1. 检查 PATH 中是否存在 `hithink-finance`，存在时读取 `hithink-finance --version`。
2. 未安装、版本异常、需要配置认证、检查内置 Skills、诊断、升级或卸载时，读取 [安装、配置与生命周期](cli/setup.md)。
3. **已经安装且确定使用 CLI 完成金融任务时，不要把本入口当成功能契约。**先运行：

   ```bash
   hithink-finance skills status --format json
   hithink-finance capabilities --format json
   ```

   然后读取 [CLI 内置 Skills 路由](cli/builtin-skills.md)，按用户意图打开已安装 CLI 所管理的对应 Skill。内置 Skill 与当前 CLI 版本同步，具有更准确的命令、参数、输出和本地数据指引。

4. 如果内置 Skills 缺失或漂移，先按 setup 契约运行 `hithink-finance skills sync`；无法修复时再用 `capabilities`、`schema <command-id>` 和 `<command> --help` 做运行时发现。

## 功能简述

- `symbol`：标的搜索与代码表。
- `market`：行情、公司行为、交易日历和本地面板。
- `financials`：三张财务报表与财务指标。
- `index`：指数/板块目录、成分和行情。
- `special`：涨停、异动、热榜与龙虎榜。
- `data` / `db`：本地数据初始化、同步、校验、修复、查询与导出。
- `auth` / `skills` / `doctor` / `update` / `uninstall`：安装后配置和生命周期。

机器读取显式使用 `--format json`。成功条件是进程退出码 0 且信封 `ok=true`；不要按上游 `code=0` 解析 CLI 输出。只有具体命令声明的 `--output` 才能落盘，它不是全局选项。
