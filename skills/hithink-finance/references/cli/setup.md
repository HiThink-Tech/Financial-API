# CLI 安装、配置与生命周期

本页只处理 CLI 是否可用、是否为合适版本、认证、内置 Skills、最小验证和卸载。安装完成后的金融功能必须转到 CLI 内置 Skills。

## 1. 安装状态与运行要求

先检查，不改变环境：

```bash
hithink-finance --version
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

`update --check` 用于比较当前安装和可用版本，不执行升级。版本正常时不要重装。需要修复或升级时先向用户说明将修改全局 npm 安装，得到授权后再使用 `hithink-finance update --repair` 或指定 `--target-version`。

## 3. 从 npm 安装

首选 npm，不默认使用源码安装：

```bash
npm install -g @hithink-tech/hithink-finance-cli
hithink-finance --version
```

用户明确选择其他接入方式时不安装 CLI。用户直接提出金融任务、未指定方式且 CLI 不存在时，先简短告知“将安装官方 CLI 并继续完成任务”，随后执行安装；平台需要授权时遵循平台授权机制，不再追加一次相同确认。遇到 `EACCES`、PATH 或 registry 问题时报告原始错误并回退到已有 MCP、REST 或 Python 路径；遇到 `E404` 时检查 registry 与包发布状态，不擅自切换未知来源。

## 4. 统一凭据

API Key 在 <https://fuyao.aicubes.cn/admin> 获取。CLI 不是统一凭据的前置条件；先检查 `HITHINK_FINANCE_API_KEY`，再检查用户级凭据文件：

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

系统凭据库不可用时，不再次索取 Key；当前任务可向 CLI 子进程注入统一环境变量继续，或回退到其他接入方式，同时说明 CLI 独立登录尚未持久化。退出认证可用 `hithink-finance auth logout`，执行前确认清理范围。

## 6. CLI 内置 Skills 检查

```bash
hithink-finance skills status --format json
```

输出中的 `canonical` 是随 CLI 发布的官方 Skills 来源；它不能证明当前 Agent 已发现 10 个 CLI 配套 Skill。确定使用 CLI 后，Agent 必须先从自身运行时配置定位**当前 Agent 的 Skills 目录**，并检查下列每个目录都存在且含有 `SKILL.md`：`hithink-finance-shared`、`hithink-finance-symbol`、`hithink-finance-market`、`hithink-finance-financials`、`hithink-finance-valuation`、`hithink-finance-index`、`hithink-finance-special-data`、`hithink-finance-fund`、`hithink-finance-data`、`hithink-finance-research`。

任何目录缺失时，先执行：

```bash
hithink-finance skills sync --format json
```

随后必须对同一个当前 Agent 的 Skills 目录复查，而不是把同步命令的退出码当成安装证明。`skills sync` 可能没有当前 Agent 的发现目录或无法覆盖该工具；若 `canonical/<skill-name>/SKILL.md` 存在、当前 Agent 的 Skills 目录已知且可写，Agent 必须主动复制每个缺失 Skill 的完整目录（含 `references/`）到当前 Agent 的目录。只复制缺失的官方目录，不覆盖无关 Skills，也不向项目目录、其他 Agent 目录或未知路径写入。已存在但被用户修改的同名目录不做手工覆盖；先用 `hithink-finance skills sync --repair --format json`，仍无法确认时报告冲突和路径。复制后再次逐目录核验，并在 Agent 需要时新建会话以重新发现。

完整领域路由见 [内置 Skills 路由](builtin-skills.md)。

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

1. 运行 `hithink-finance skills status --format json`；核验当前 Agent 的 Skills 目录，必要时同步并主动复制缺失 Skills。
2. 新建 Agent 会话，让新安装的内置 Skills 被重新发现。
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
