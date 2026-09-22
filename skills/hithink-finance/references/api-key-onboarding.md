# 首次登录、API Key 创建与持久配置

本页提供首次接入的推荐路径。目标是用户只扫码一次，具备浏览器与本地环境操作能力的 Agent 随后独立完成 API Key 创建或复用、持久配置和验证。具体浏览器工具、脚本语言与密钥传递方式由 Agent 根据当前环境选择。

## 推荐路径

1. **先复用本地凭据**：检查用户级 `HITHINK_FINANCE_API_KEY`、用户级 `credentials.env` 和 CLI 凭据状态。已有 Key 通过最小真实请求时直接结束，不创建重复 Key。
2. **打开正确入口**：使用 <https://fuyao.aicubes.cn/admin/>。必须保留末尾 `/`；不带末尾 `/` 的管理页当前会从 HTTPS 重定向到 HTTP，导致扫码后的登录态无法保存。
3. **只让用户完成扫码**：使用用户设备上的可见本地浏览器。未登录时进入 <https://fuyao.aicubes.cn/login/>，切换到“同花顺APP / 扫一扫登录”。确认窗口实际可见后再提示用户扫码。登录成功后返回 HTTPS 管理页。
4. **复用或签发 Key**：管理页“已创建 API Key”表格包含“别名 / API Key / 操作”，已有项可“查看”或“删除”。优先查看并复用已有 Key；确需新建时点击“创建 API Key”，在“获取 API Key”对话框填写最长 64 字符的“别名”，再点击“签发 API Key”。
5. **交给 Agent 配置**：Agent 可读取页面中的 Key、使用复制粘贴、浏览器内存、stdin、临时进程环境或其他当前工具支持的方式完成配置。用户也可以直接把 Key 提供给 Agent 上下文；Agent 接收后不复述，并提示聊天平台可能保留消息记录。
6. **写入持久来源**：至少建立一个跨会话持久来源，并让当前任务立即可用。推荐同时配置用户级 `HITHINK_FINANCE_API_KEY` 和用户级 `credentials.env`；CLI 已安装时再同步系统凭据库，MCP 客户端按其能力使用环境变量插值或 Secret。
7. **分层验收**：确认持久来源存在且非空；CLI 已安装时检查 `auth status`；最后执行一个有界真实请求，要求 CLI 退出码为 0 且信封 `ok=true`，或 REST/MCP 业务信封 `code=0`。

## 跨平台持久配置

| 平台 | 推荐持久来源 | 用户级凭据文件 | 注意事项 |
| --- | --- | --- | --- |
| Windows | User scope 的 `HITHINK_FINANCE_API_KEY` | `%APPDATA%\hithink-finance\credentials.env` | 设置 User scope 后，当前已运行的 Agent 不会自动继承；本次任务应同时注入自己的子进程，不要求用户重启 |
| macOS | 用户 Shell 环境或客户端 Secret | `~/Library/Application Support/hithink-finance/credentials.env` | 默认 zsh 可写入 `~/.zshenv`；GUI 客户端不继承 Shell 时使用其 Secret，或由 Agent 直接读取用户级文件 |
| Linux | 用户 Shell 环境、`environment.d` 或客户端 Secret | `${XDG_CONFIG_HOME:-~/.config}/hithink-finance/credentials.env` | 根据桌面与 Shell 选择持久机制；不要写系统级 `/etc/environment` 或要求 sudo |

`credentials.env` 只写一行 `HITHINK_FINANCE_API_KEY=...`，不放在项目目录。Unix 目录建议 `0700`、文件 `0600`；Windows 限制为当前用户可读写。更新时优先使用同目录临时文件加原子替换。

CLI 已安装时通过 stdin 同步，不把 Key 放入命令参数：

```text
hithink-finance auth login --api-key-stdin --format json
```

替换已有 Key 时增加 `--replace`，不要先 logout。系统凭据库不可用只表示 CLI 副本未同步；保留已经成功的用户级环境变量或凭据文件，并继续当前任务。

各平台可复制的隐藏输入示例见 [CLI 安装与配置](cli/setup.md#4-统一凭据)。这些命令是参考实现，不限制 Agent 使用等价且更适合当前工具的方式。

## 必要避坑

- **管理页尾斜杠**：始终使用 <https://fuyao.aicubes.cn/admin/>，并在扫码前后确认地址栏仍为 HTTPS。
- **窗口必须真实可见**：自动化工具返回“已打开”不等于用户能看到窗口。提示扫码前确认会话仍在运行、窗口未最小化且已显示二维码。
- **复制不一定进入系统剪贴板**：隔离浏览器可能使用自己的剪贴板。复制后无法读取时，改用浏览器上下文读取、用户直接提供 Key 或其他可用通道，不要重复签发 Key。
- **创建和配置是两层成功**：管理页出现新别名只证明签发完成；持久来源读回和真实请求通过后才算配置完成。
- **不要用环境变量掩盖凭据库验证**：验证 CLI 系统凭据副本时，从验证子进程移除 `HITHINK_FINANCE_API_KEY`。
- **避免不必要的重复扫码**：登录态异常先检查 HTTP 降级、浏览器窗口、第三方 Cookie 和登录 iframe 是否来自 `https://upass.aicubes.cn/login`。

## 凭据边界

为了减少用户操作，API Key 可以由用户主动提供给 Agent 上下文，也可以由浏览器操作结果交给 Agent。Agent 应说明聊天平台可能保留上下文，并遵循以下边界：

- 不复述或展示收到的 Key。
- 不把 Key 写入代码、README、Issue、日志、测试产物、项目配置或 Git。
- 不把 Key 放进命令行参数；优先使用 stdin、进程环境、用户级凭据文件、系统凭据库或客户端 Secret。
- 配置和验证完成后清理临时变量、临时文件和剪贴板中的 Key；持久来源按用户要求保留。

最终只报告使用的持久来源、CLI/MCP 是否同步、真实请求是否通过，以及仍需用户处理的唯一动作。
