# Monorepo 版本升级指南

本指南面向从旧版根级 Python 布局升级的用户和 AI Agent。新版将项目升级为“同花顺金融数据服务（hithink finance）”monorepo；目录和公开入口发生变化，但不改变 `marketdb` 包名、`marketdb` 命令、Python API、数据库 schema 或上游 REST API 契约。

## 是否需要重装 marketdb

如果曾执行 `python -m pip install -e .`，必须更新 editable 映射：

```powershell
python -m pip uninstall marketdb
python -m pip install -e ./python
```

卸载 Python 包不会删除 `data/market.duckdb`、`refer-to/data/`、`.env` 或 `out/`。

如果使用普通 `pip install .`，旧安装副本不会因为 `git pull` 立即失效，但也不会自动切换到新源码。需要使用新版本时，从 monorepo 根重新安装：

```powershell
python -m pip install --force-reinstall ./python
```

如果只从源码运行测试或脚本，无需安装即可使用新路径；`marketdb` 全局命令仍要求安装包。

## 路径变化

旧路径不保留转发文件。请一次性更新脚本、CI、Prompt 和 Agent 配置：

| 旧用法 | 新用法 |
| --- | --- |
| `python -m pip install -e .` | `python -m pip install -e ./python` |
| `python bootstrap.py` | `python python/bootstrap.py` |
| `python toolkit/fuyao/scripts/fuyao.py ...` | `python python/toolkit/fuyao/scripts/fuyao.py ...` |
| `python examples/01_quickstart.py` | `python python/examples/01_quickstart.py` |
| `python -m pytest tests/` | `python -m pytest python/tests/` |
| `toolkit/README.md` | `python/toolkit/README.md` |
| `toolkit/marketdb/README.md` | `python/toolkit/marketdb/README.md` |
| `toolkit/fuyao/README.md` | `python/toolkit/fuyao/README.md` |
| `examples/inspirations/scripts/build_index.py` | `python/tools/inspirations/build_index.py` |

安装后的命令名保持不变，例如：

```powershell
marketdb status --db ./data/market.duckdb
marketdb validate --db ./data/market.duckdb
```

## 数据与配置不需要迁移

以下资产继续位于 monorepo 根，不需要迁移、复制、转换或重新下载：

```text
data/market.duckdb
refer-to/data/
.env
out/
```

升级后第一次检查请从 monorepo 根执行，并显式传入旧数据库路径：

```powershell
Test-Path ./data/market.duckdb
marketdb status --db ./data/market.duckdb
marketdb describe --db ./data/market.duckdb
marketdb validate --db ./data/market.duckdb
```

不要把 `python/data/market.duckdb` 当作新默认位置，也不要因为命令找不到数据库就删除或重建旧库。先检查当前工作目录和 `--db` / `MARKETDB_DB_PATH`。

旧项目 `.env` 仍可留在仓库根，但新的统一凭据不放在项目目录。推荐使用用户级 `HITHINK_FINANCE_API_KEY` 或 Skill 管理的用户级 `hithink-finance/credentials.env`；`API_KEY`、`FUYAO_TOKEN` 仅作为兼容来源，不需要复制到 `python/`，也不得写入命令、Prompt 或提交。

## Agent 兼容步骤

旧版 Prompt 或项目规则若引用根级 `toolkit/`，需要改为 `python/toolkit/`。Agent 进入仓库后按以下顺序读取：

1. 根 `AGENTS.md`；
2. `skills/hithink-finance/SKILL.md`；
3. `python/toolkit/README.md`；
4. 具体任务对应的 `python/toolkit/marketdb/README.md` 或 `python/toolkit/fuyao/README.md`。

不要让 Agent 猜测旧路径，也不要在旧位置创建兼容副本。大结果落盘、API Key 保密和本地/远端数据路由规则保持不变。

## 安装与路径诊断

```powershell
python -m pip show marketdb
python -c "import marketdb; print(marketdb.__file__)"
Get-Command marketdb
```

editable 安装正确时，`marketdb.__file__` 应位于当前 checkout 的 `python/marketdb/` 下。如果仍指向其他 clone 或旧环境，请确认 `python` 与 `pip` 属于同一解释器，然后重新执行卸载和 `python -m pip install -e ./python`。

## 升级后快速验证

```powershell
python python/bootstrap.py --help
python python/toolkit/fuyao/scripts/fuyao.py --help
python python/tools/inspirations/build_index.py --check
python -m pytest python/tests/
```

三个 Python 示例依赖根级 `data/market.duckdb`；数据库不存在时会停止并提示新 bootstrap 路径，不会静默下载或创建模拟数据。

## 回退

需要回退时只回退代码并重新安装对应版本：

1. 保留 `data/market.duckdb`、`refer-to/data/`、`.env` 和 `out/` 不动；
2. 按团队 Git 流程切回旧代码版本；
3. 使用同一解释器从旧项目根重新执行 `python -m pip install -e .`；
4. 用显式 `--db ./data/market.duckdb` 重新执行 `status` 和 `validate`。

代码回退不要求回退或删除本地数据，因为本次 monorepo 迁移没有修改数据库 schema。
