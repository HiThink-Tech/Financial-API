# `hithink-finance data sync`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema data.sync --format json` 确认当前参数契约。
- 本地命令通常需要可用 DuckDB 或本地数据目录。
- 需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。
- 命令会持有数据锁，避免并发写库。

## 命令

```bash
hithink-finance schema data.sync --format json
hithink-finance data sync --format json
```

## 参数选择策略

- 使用全局 `--db` 指定库路径；默认路径来自平台数据目录。

## 窗口与分页

- 本地命令无远端分页；只有声明 `--output` 的命令可直接落盘；其他大结果改用导出命令。

## 常见错误

- 本地库不存在或 schema 不兼容时先运行 `data status` / `data migrate`。
- 认证失败时先回到 shared skill 的 auth 流程。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
