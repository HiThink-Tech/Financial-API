# 认证和配置

## 前置条件

- CLI 依次使用显式安全输入、进程环境变量 `HITHINK_FINANCE_API_KEY`、所选 profile 的系统凭据库。已有来源可用时直接复用。
- 若统一 Key 保存在用户级 `hithink-finance/credentials.env`，由 Agent 安全读取并注入本次进程环境或 stdin；CLI 不自动读取该文件。Windows 位于 `%APPDATA%` 下，macOS 位于 `~/Library/Application Support/` 下，Linux 位于 `$XDG_CONFIG_HOME`（默认 `~/.config`）下。
- API Key 获取地址为 https://fuyao.aicubes.cn/admin/；交互式用户可运行 `hithink-finance auth login`，CLI 会说明用途并隐藏输入。
- 用户可以为了便利把 Key 提供给 Agent 上下文；Agent 不复述，并提示聊天平台可能保留消息记录。不要把密钥写入项目配置、日志、Git、Markdown 或其他可共享内容。

## 命令

```bash
hithink-finance auth login --api-key-stdin --format json
hithink-finance auth login
hithink-finance auth status --format json
hithink-finance auth logout --format json
hithink-finance config show --format json
```

## 参数选择策略

- 交互式终端可用 `auth login` 隐藏输入。
- 如果 `auth login` 提示已登录，需要切换 API Key 时运行 `auth login --replace`；Agent/CI 使用 `auth login --api-key-stdin --replace`，无需先删除旧凭据。
- Agent/CI 优先用 `--api-key-stdin` 或 `HITHINK_FINANCE_API_KEY`。
- `--api-key <value>` 仅为旧脚本兼容保留，已从帮助中隐藏且会输出弃用警告；不要在新调用中使用。
- `auth status` 的 `configured` 仅表示系统凭据库中是否存有 Key；false 不能否定环境变量或 stdin，true 也不是服务验权结果。
- 多套持久化凭据使用全局 `--profile <name>`；进程环境变量优先于 profile 的系统凭据。全部来源缺失时才引导登录。
- `config show` 只显示非敏感项；不要期待它返回 API Key。

## 常见错误

- `AUTH_API_KEY_MISSING`：运行 `auth login` 或设置 `HITHINK_FINANCE_API_KEY`。
- `CLI_MISSING_ARGUMENT`：非交互场景使用 `auth login --api-key-stdin`，不要把 API Key 写入对话或日志。
- `CLI_CONFLICTING_ARGUMENTS`：不要同时传 `--api-key` 和 `--api-key-stdin`。
- `CLI_STDIN_TOO_LARGE`：缩小 stdin 输入；API Key 上限 16 KiB，批量代码上限 1 MiB。
- `CONFIG_NOT_FOUND`：`--config` 或 `HITHINK_FINANCE_CONFIG` 指定的文件必须存在；修正路径或移除显式设置。
