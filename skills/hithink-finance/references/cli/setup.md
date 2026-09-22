# CLI 安装、配置与生命周期

本页只处理 CLI 是否可用、是否为合适版本、认证、内置 Skills、最小验证和卸载。安装完成后的金融功能必须转到 CLI 内置 Skills。

## 1. 安装状态与运行要求

先检查，不改变环境：

```bash
hithink-finance version --format json
node --version
npm --version
```

- 命令存在且能返回版本：继续检查版本、认证和 Skills。
- 命令不存在：要求 Node.js `>=22.12.0` 与可用 npm。
- 不要仅凭目录存在判断全局命令已安装；应以 PATH 中可执行命令为准。

## 2. 版本检查

```bash
hithink-finance update --check --format json
npm view @hithink-tech/hithink-finance-cli version
```

`update --check` 用于比较当前安装和可用版本，不执行升级。需要升级时先向用户说明将修改全局 npm 安装，得到授权后运行 `hithink-finance update` 更新到 npm latest；指定版本或回滚使用 `update --target-version <version>`；仅修复当前安装时使用 `update --repair`。`--check`、`--target-version` 与 `--repair` 互斥。

统一 Skill 的例行自检通过 `hithink-finance version --format json` 进入 CLI 自带检查链路，不额外调用本节命令。CLI 成功检查后缓存 24 小时，失败后冷却 6 小时，并用 5 分钟租约合并并发刷新；例行自检不等待后台结果。无新版本、刷新中、检查失败或用户禁用检查时保持静默，只有 CLI 输出 `[update]` 时才在当前任务结束后提示一次。不要用 `npm view` 绕过缓存做例行检查。

## 3. 从 npm 安装

首选 npm，不默认使用源码安装：

```bash
npm install -g @hithink-tech/hithink-finance-cli
hithink-finance version --format json
```

用户明确选择其他接入方式时不安装 CLI。用户直接提出金融任务、未指定方式且 CLI 不存在时，先简短告知“将安装官方 CLI 并继续完成任务”，随后执行安装；平台需要授权时遵循平台授权机制，不再追加一次相同确认。遇到 `EACCES`、PATH 或 registry 问题时报告原始错误并回退到已有 MCP 或 REST 路径；遇到 `E404` 时检查 registry 与包发布状态，不擅自切换未知来源。

## 4. 统一凭据

API Key 在 <https://fuyao.aicubes.cn/admin/> 获取。CLI 不是统一凭据的前置条件；先检查 `HITHINK_FINANCE_API_KEY`，再检查用户级凭据文件：

首次登录、浏览器代办、扫码登录、用户自行操作和自动降级的完整流程见 [首次登录、创建与持久配置](../api-key-onboarding.md)。本节保留各平台的具体命令。

| 平台 | 用户级凭据文件 |
| --- | --- |
| Windows | `%APPDATA%\hithink-finance\credentials.env` |
| macOS | `~/Library/Application Support/hithink-finance/credentials.env` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/hithink-finance/credentials.env` |

文件只写一行 `HITHINK_FINANCE_API_KEY=...`，等号右侧直接填写原始 Key，不加单引号或双引号；不放在项目目录。Unix 权限设为 `0600`；Windows 仅允许当前用户访问。

需要自行配置当前用户的持久环境变量时，按当前平台使用隐藏输入。Windows PowerShell：

```powershell
$secureKey = Read-Host 'API Key' -AsSecureString
$key = [System.Net.NetworkCredential]::new('', $secureKey).Password
[Environment]::SetEnvironmentVariable('HITHINK_FINANCE_API_KEY', $key, 'User')
$env:HITHINK_FINANCE_API_KEY = $key
Remove-Variable key, secureKey
```

macOS 默认 zsh：

```zsh
read -s 'HITHINK_FINANCE_API_KEY?API Key: '; echo
export HITHINK_FINANCE_API_KEY
printf '\nexport HITHINK_FINANCE_API_KEY=%q\n' "$HITHINK_FINANCE_API_KEY" >> ~/.zshenv
chmod 600 ~/.zshenv
```

Linux Bash：

```bash
read -rsp 'API Key: ' HITHINK_FINANCE_API_KEY; echo
export HITHINK_FINANCE_API_KEY
printf '\nexport HITHINK_FINANCE_API_KEY=%q\n' "$HITHINK_FINANCE_API_KEY" >> ~/.bashrc
chmod 600 ~/.bashrc
```

也可以直接发给我，由 Agent 使用 stdin、进程环境或受限凭据文件完成配置。Agent 不复述 Key，不把它放进命令参数、日志、项目文件或 Git。聊天平台可能保留消息记录，因此隐藏输入或环境变量方式更安全。

## 5. CLI 无感登录

先读取 CLI 自身状态：

```bash
hithink-finance auth status --format json
```

统一凭据已经存在而 CLI 尚未登录时，不再次询问用户；将统一凭据只通过 stdin 传给 CLI：

```bash
printf '%s' "$HITHINK_FINANCE_API_KEY" | \
  hithink-finance auth login --api-key-stdin --format json
```

统一凭据刚更新且 CLI 已登录时，原子替换系统凭据，不先 logout：

```bash
printf '%s' "$HITHINK_FINANCE_API_KEY" | \
  hithink-finance auth login --api-key-stdin --replace --format json
```

凭据来自用户级文件时，Agent 在进程内读取后直接写入 CLI stdin，不经 stdout 或命令参数。同步只发生在 CLI 安装完成、统一凭据新增/更新或认证恢复时，普通调用不重复写入系统凭据。

CLI 独立使用时仍可运行隐藏输入：

```bash
hithink-finance auth login
```

登录后再次运行 `auth status`，并做一个有界真实请求。验证 CLI 系统凭据能独立工作时，不向该验证子进程注入 `HITHINK_FINANCE_API_KEY`，避免环境变量掩盖系统凭据失败。

系统凭据库不可用时，不再次索取 Key；保留已经写入的用户级环境变量或用户级凭据文件，当前任务向 CLI 子进程注入统一环境变量继续，同时说明 CLI 系统凭据副本未同步。退出认证可用 `hithink-finance auth logout`，执行前确认清理范围。

## 6. CLI 内置 Skills 检查

```bash
hithink-finance skills status --format json
```

输出中的 `canonical` 是随 CLI 发布的官方 Skills 来源；同时读取 `strategy`、`content` 和 `targets` 判断已保存目标、共享内容及逐目标文件状态。`ready` 表示链接或复制内容通过文件校验，不代表客户端会话已经加载；新增后按客户端需要刷新或新建会话。

当前 Agent 已受支持、目录缺失且用户保存策略允许同步时，执行：

```bash
hithink-finance skills sync --agent <当前 Agent> --format json
```

随后运行 `hithink-finance skills status --format json` 复查该目标，而不是把同步命令退出码当成客户端加载证明。`sync --agent <名称>` 是追加操作；用户后来安装另一个 Agent 时使用同一命令追加，例如 `sync --agent claude-code`。未知或用户占用的同名目录不会被覆盖；先检查 `status`。未知 Agent、目标目录冲突或会话不能刷新时，直接读取 `canonical` 中的 Skill 完成当前任务；用户已禁用同步时保留其选择，不重新启用。仅在该客户端不兼容目录链接且路径已确认时，使用 `sync --agent <名称> --directory <绝对路径> --copy` 保存复制模式。不要手工复制、改名或覆盖官方目录。

完整领域路由见 [内置 Skills 路由](builtin-skills.md)。

`skills remove --agent <名称>` 只移除该目标的 CLI 托管内容，并阻止自动检测重新添加；无 `--agent` 的 `skills remove` 会禁用后续自动重装。用户明确要求移除时按指定范围执行。

## 7. 配置与最小验证

先做离线诊断：

```bash
hithink-finance doctor --format json
hithink-finance capabilities --format json
```

再做一个有界的线上最小验证：

```bash
hithink-finance symbol search --q 600519 --limit 1 --format json
```

只有退出码 0、信封 `ok=true` 且返回真实结果，才能说明当前认证和远端访问可用。`doctor`、help 或离线 schema 通过不能代替线上验证。

## 8. 安装后建议

1. 运行 `hithink-finance skills status --format json`；核验当前 Agent 的目标状态，必要时用 `sync --agent <名称>` 追加或修复。
2. 当前任务可直接读取 `canonical` 中的内容；按客户端需要刷新或新建 Agent 会话，让内置 Skills 在后续任务被自动发现。
3. 在新会话直接描述需求，或快速开始：

   ```bash
   hithink-finance symbol search --q "贵州茅台" --limit 5 --format json
   hithink-finance market snapshot --thscodes 600519.SH --format json
   hithink-finance data status --format json
   ```

4. 选定功能后读取对应 CLI 内置 Skill，而不是继续依赖本 setup 页猜命令。

## 9. 卸载

先预览，不修改任何内容：

```bash
hithink-finance uninstall --plan --format json
```

确认计划后，默认卸载 CLI 与其管理的 Skills：

```bash
hithink-finance uninstall --yes --format json
```

`--purge-data`、`--purge-config` 和 `--purge-credentials` 会额外删除用户数据、配置或凭据，只能在用户明确指定对应范围后添加。不要用手工递归删除替代内置卸载流程。
