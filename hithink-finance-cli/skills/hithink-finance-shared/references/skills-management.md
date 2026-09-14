# Skills 管理

## 命令

```bash
hithink-finance skills status --format json
hithink-finance skills sync --format json
hithink-finance skills remove --format json
```

## 参数选择策略

- 首次安装和升级默认读取已保存策略：`auto` 仅检测已安装的 Codex、Claude Code、Cursor、Gemini CLI、OpenCode、GitHub Copilot CLI、Trae、WorkBuddy 与 QClaw；仅存在历史 `skills` 目录不算客户端证据，也不会创建未检测到的根目录。
- 安装时可用 `HITHINK_FINANCE_SKILLS_AGENTS=auto` 或逗号分隔的目标替换策略。安装后 `sync --agent <name>` 是追加，不会移除已选目标；`sync --agent auto` 恢复自动检测并保留显式目标。
- `status` 同时报告包内 manifest、共享内容、策略和逐目标文件验证。`ready` 只表示文件和链接/副本有效，不代表客户端已经加载；必要时新建会话。
- 默认在 CLI 用户级数据目录维护一份共享内容，并在每个目标的各 Skill 目录建立链接；Windows 优先目录 junction，其他平台使用目录 symlink。`--copy` 只用于显式目标不兼容链接时，并保存该目标的复制模式以便升级继续更新。
- `sync --agent <name> --directory <absolute-path>` 仅允许一个具体目标，并保存该客户端实际读取的 Skills 根目录。`--repair` 修复 CLI 托管内容；未知或用户占用的同名目录会报告冲突而不会覆盖。
- `remove --agent <name>` 仅移除该目标的 CLI 托管内容，并将它加入自动检测排除列表；无 `--agent` 时移除全部托管内容并禁用后续自动重装，直到再次 `sync`。
- 同步由互斥锁保护；新共享内容先校验再发布。单个目标失败会如实报告部分失败，保留其他已验证目标和旧内容。

## 常见错误

- npm 禁用生命周期脚本时，安装完成后运行 `hithink-finance skills sync --repair --format json`；直接 `npm uninstall -g` 不能保证清理托管链接，先运行 `hithink-finance skills remove`。
- 目标冲突、链接权限或客户端不发现链接时，先运行 `skills status --format json`；确认客户端支持后可对该单一目标重新执行 `sync --agent <name> --copy`。
- 不要手工删除或覆盖用户自建 Skill、未知同名目录或非 `hithink-finance-*` 内容。
