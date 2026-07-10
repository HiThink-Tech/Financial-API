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

Agent 可以辅助执行，但全局安装前必须获得用户明确授权。遇到 `EACCES`、PATH 或 registry 问题时报告原始错误并给出针对性处理；遇到 `E404` 时检查 registry 与包发布状态，不擅自切换未知来源。

## 4. 认证配置

API Key 在 <https://fuyao.aicubes.cn/admin> 获取。先读取状态：

```bash
hithink-finance auth status --format json
```

需要配置时由用户在自己的终端运行隐藏输入：

```bash
hithink-finance auth login
```

不得让用户在对话中发送 Key。Agent/CI 场景使用工具当前帮助中声明的 stdin、进程环境变量或凭据方式，并避免命令历史和日志泄露。退出认证可用 `hithink-finance auth logout`，执行前确认清理范围。

## 5. CLI 内置 Skills 检查

```bash
hithink-finance skills status --format json
```

状态应表明 8 个随 CLI 发布的领域 Skills 已安装且与当前版本一致。缺失或漂移时，在获得写入 Agent Skills 目录的授权后执行：

```bash
hithink-finance skills sync --format json
```

仍不一致时可先读取 `hithink-finance skills sync --help`，再使用 `--repair`。不要手工复制包内文件来绕过 CLI 的清单和校验机制。完整领域路由见 [内置 Skills 路由](builtin-skills.md)。

## 6. 配置与最小验证

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

## 7. 安装后建议

1. 运行 `hithink-finance skills status --format json` 并同步缺失 Skills。
2. 新建 Agent 会话，让新安装的内置 Skills 被重新发现。
3. 在新会话直接描述需求，或快速开始：

   ```bash
   hithink-finance symbol search --q "贵州茅台" --limit 5 --format json
   hithink-finance market snapshot --thscodes 600519.SH --format json
   hithink-finance data status --format json
   ```

4. 选定功能后读取对应 CLI 内置 Skill，而不是继续依赖本 setup 页猜命令。

## 8. 卸载

先预览，不修改任何内容：

```bash
hithink-finance uninstall --plan --format json
```

确认计划后，默认卸载 CLI 与其管理的 Skills：

```bash
hithink-finance uninstall --yes --format json
```

`--purge-data`、`--purge-config` 和 `--purge-credentials` 会额外删除用户数据、配置或凭据，只能在用户明确指定对应范围后添加。不要用手工递归删除替代内置卸载流程。
