# Skills 管理

## 命令

```bash
hithink-finance skills status --format json
hithink-finance skills sync --format json
hithink-finance skills remove --format json
```

## 参数选择策略

- `status` 只检查 CLI 包内 manifest 和规范目录；`targets_verified: false` 表示尚未验证各 Agent 的发现目录，不能据此宣称已安装。
- `sync` 与 `sync --repair` 都会覆盖同步缺失或漂移的官方文件；后者在结构化结果中返回 `mode: repair`，便于更新流程和自动化审计。
- `remove` 只移除本 CLI manifest 拥有的 10 个 skill，不做全局清空。
- 若某个 Agent 不在自动安装范围内，读取 `status --format json` 的 `canonical` 目录，并把其中 10 个 `hithink-finance-*` 目录复制到该 Agent 文档声明的 skills 发现目录。

## 常见错误

- 自动安装可覆盖时，不要手工复制 skill 文件绕过 manifest；用 CLI 的 skills 子命令。
- 手工兜底安装时，不要改名、拆分或只复制部分 reference 文件；保持整个 skill 目录原样复制。
- 不要删除用户自建 skill 或非 hithink-finance 前缀 skill。
