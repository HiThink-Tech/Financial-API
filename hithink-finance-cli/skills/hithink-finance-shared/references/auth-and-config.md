# 认证和配置

## 前置条件

- API Key 只能来自系统凭据库、进程环境变量 `HITHINK_FINANCE_API_KEY`、stdin 或当前进程参数。
- API Key 获取地址为 https://fuyao.aicubes.cn/admin；交互式用户可运行 `hithink-finance auth login`，CLI 会说明用途并隐藏输入。
- 不要把密钥写入配置文件、日志、Git、Markdown 或对话正文。

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
- 多套凭据使用全局 `--profile <name>`。
- `config show` 只显示非敏感项；不要期待它返回 API Key。

## 常见错误

- `AUTH_API_KEY_MISSING`：运行 `auth login` 或设置 `HITHINK_FINANCE_API_KEY`。
- `CLI_MISSING_ARGUMENT`：非交互场景使用 `auth login --api-key-stdin`，不要把 API Key 写入对话或日志。
- `CLI_CONFLICTING_ARGUMENTS`：不要同时传 `--api-key` 和 `--api-key-stdin`。
