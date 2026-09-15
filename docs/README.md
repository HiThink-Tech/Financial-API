# 文档中心

这里集中维护“同花顺金融数据服务”的公开文档。根 [`README.md`](../README.md) 负责项目总览和最短上手路径；本目录负责跨接入模式的公共说明与上游契约。Python、CLI 和示例的详细运行方式分别留在对应子项目 README 中。

## 从哪里开始

| 目标 | 文档 |
| --- | --- |
| 第一次使用或选择接入方式 | [项目 README](../README.md) |
| 从旧版根级 Python 布局升级 | [Monorepo 版本升级指南](monorepo-migration.md) |
| 直接调用 REST API、查参数或响应字段 | [REST API 契约](api/README.md) |
| 为聊天客户端配置托管 MCP | [MCP 接入说明](mcp.md) |
| 安装并使用 Node.js CLI | [CLI README](../hithink-finance-cli/README.md) |
| 使用 Python toolkit、SDK 和本地 marketdb | [Python README](../python/README.md) |
| 安装跨 API/MCP/CLI/Python 的 Agent Skill | [`hithink-finance` Skill](../skills/hithink-finance/SKILL.md) |
| 关注后续客户端接入进展 | [了解并下载同花顺AI客户端](https://lumi.10jqka.com.cn/?channel=Hithink-API) |
| 浏览代码样例和金融看板灵感 | [示例入口](../examples/README.md) |

当前可通过 API、MCP、CLI、Python SDK 和 Agent Skill 接入金融数据。同花顺AI客户端尚未发布接入本项目数据源的版本，后续版本计划接入，敬请期待。

## 文档边界

- `docs/api/` 与 `docs/mcp/` 按业务域组织原子文档；正文从文档源同步，业务域首页集中提供分组和选路条件。统一 Skill 通过脚本递归镜像。
- 文档全文聚合：<https://fuyao.aicubes.cn/llms-full.txt>。本地查询按业务域首页进入目标接口或工具页。
- `hithink-finance-cli/` 只说明 CLI 的安装、命令和运行语义，不复制上游响应字段契约。
- `python/` 只说明 Python toolkit、SDK、marketdb 和脚本运行方式，不复制上游响应字段契约。
- MCP 的实时工具清单和参数 schema 以客户端当前 `tools/list` 为准；本仓库只维护接入方式和能力边界。

## 契约同步

修改 `docs/api/` 或 `docs/mcp.md` 后，从仓库根执行：

```bash
python scripts/sync_skill_contracts.py
python scripts/sync_skill_contracts.py --check
```

第一条命令更新独立发布 Skill 中的镜像，第二条命令用于 CI 或提交前检查。不要直接编辑 `skills/hithink-finance/references/api/` 或 `skills/hithink-finance/references/mcp.md`。
