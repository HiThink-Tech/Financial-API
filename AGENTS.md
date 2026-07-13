# AGENTS.md

> 任何 AI coding/data Agent 进入本仓库后的公开入口。项目品牌为“同花顺金融数据服务（hithink finance）”。

## 必读顺序

1. 旧 checkout、旧 Prompt 或旧根级 Python 路径：先读 [`docs/monorepo-migration.md`](docs/monorepo-migration.md)。
2. 所有金融数据任务：先读 [`skills/hithink-finance/SKILL.md`](skills/hithink-finance/SKILL.md)。
3. 只加载 Skill 选择的一个接入方式或端点组，不要递归读取全部契约。

## Monorepo 边界

- `hithink-finance-cli/`：Node.js CLI 子项目，面向人类、Agent 和自动化；运行时不依赖 Python。
- `python/`：唯一 Python 项目根，包含远端取数 toolkit、本地 `marketdb`、示例和测试。
- `docs/`：公共文档中心；`docs/api/` 是仓库内唯一上游 REST API 契约源。
- `skills/hithink-finance/`：可独立发布的统一 Skill；API/MCP 契约由脚本从 `docs/` 镜像。
- `examples/`：monorepo 级示例导航与静态灵感。

## 选择接入方式

| 场景 | 优先入口 |
| --- | --- |
| 人类终端、Agent 执行、自动化、远端+本地一体化 | `hithink-finance` CLI |
| 已连接 MCP 的 Chat 场景 | 托管 MCP |
| 零依赖 HTTP、自定义语言或服务端 | REST API |
| Python/Notebook/研究或已有 marketdb | Python toolkit/SDK |

CLI 已安装时先运行 `hithink-finance capabilities --format json`，再按需运行 `schema <id>`；MCP 以实时 `tools/list` 为准；REST 响应字段以 `docs/api/` 及远端 <https://fuyao.aicubes.cn/llms-full.txt> 为准；Python 适配层参数以当前函数签名和 `--help` 为准。

## API Key

所有远端接入方式使用在 <https://fuyao.aicubes.cn/admin> 获取的统一 API Key。推荐统一来源是用户级 `HITHINK_FINANCE_API_KEY`，其次是 `hithink-finance/credentials.env` 用户级凭据文件。

- 每次使用 Skill 时先检查统一凭据来源；找到后直接复用，不得因切换接入方式再次索要。
- 不得强制用户把 Key 粘贴到对话；用户主动提供或选择 Agent 代配时，不得复述，并应安全写入用户级统一凭据来源。
- 不得把 Key 写入代码、Prompt、日志、公开配置、产物或 Git。
- CLI 安装、统一凭据新增或更新后，通过 stdin 登录；已有 CLI 凭据用 `auth login --api-key-stdin --replace` 原子替换。CLI 系统凭据库保留独立副本。
- REST/Python 读取统一环境变量或用户级凭据文件；旧变量仅兼容。
- MCP 优先使用 `${HITHINK_FINANCE_API_KEY}`，不继承环境时由 Agent 从统一来源配置客户端 Secret。

## 大数据纪律

禁止把全市场、分页全集、多年或多标的原始结果输出到会话上下文。

```bash
<command> ... > /tmp/result.json
# 只报告文件路径、行数、时间窗口和摘要
```

CLI 优先使用具体命令的 `--output`、`db export` 或 `market panel --output`。Python/marketdb 将结果写到 `/tmp/`、`out/` 或用户指定路径。不要回显凭证或完整数据文件。

## 文档治理

- 根 README 做项目总览；子目录 README 详细解释当前目录，不把细节继续拆散到不必要的多层文档。
- 上游 REST API 契约只在 `docs/api/` 维护；修改后运行：

  ```bash
  python scripts/sync_skill_contracts.py
  python scripts/sync_skill_contracts.py --check
  ```

- 不要直接编辑 `skills/hithink-finance/references/api/` 或 `references/mcp.md`。
- 不要在 Python、CLI、examples 或其他 README 中复制上游参数表、响应字段表和错误码全集；这些文档只说明自身功能与运行方式并链接契约。
- 仓库不保存 `llms.txt`、`llms-full.txt` 或相似副本，只链接远端地址。
- 改动公开能力、命令、选项或路由时，同步更新 README、统一 Skill、契约镜像和开发期契约测试。

## 验证

```bash
python scripts/sync_skill_contracts.py --check
python -m pytest python/tests/

cd hithink-finance-cli
npm run verify
```

批量文档变更还要运行相对链接、旧品牌、旧 Skill 路径和重复契约扫描。离线测试不能证明线上认证或实时服务可用；只有实际授权请求才能称为线上验证。

## 入口索引

- 项目总览：[`README.md`](README.md)
- 文档中心：[`docs/README.md`](docs/README.md)
- REST API 契约：[`docs/api/README.md`](docs/api/README.md)
- MCP：[`docs/mcp.md`](docs/mcp.md)
- CLI：[`hithink-finance-cli/README.md`](hithink-finance-cli/README.md)
- Python：[`python/README.md`](python/README.md)
- Toolkit 路由：[`python/toolkit/README.md`](python/toolkit/README.md)
- 示例：[`examples/README.md`](examples/README.md)
