---
name: hithink-finance-shared
description: '用于 Agent 通过 hithink-finance CLI 做安装后自检、API Key 认证、配置、版本更新、诊断、卸载、Skills 安装/同步/移除，以及 JSON 输出、安全和大结果处理规则；不要用于行情、财务、指数、特色数据或研究取数。'
---

# hithink-finance-shared

共享规则和生命周期入口。只放全局约束、认证、输出、安全、更新和 Skills 管理，不承载业务取数路由。

## 前置条件表

| 条件                            | 操作                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| 第一次接触此 CLI 或怀疑版本漂移 | 运行 `hithink-finance version --format json` 和 `hithink-finance capabilities --format json` |
| 需要机器读取                    | 始终加 `--format json`                                                                       |
| 结果可能很大                    | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                |
| 需要远端同花顺金融数据服务      | 先确认 `auth status` 或准备 `HITHINK_FINANCE_API_KEY` / `--api-key-stdin`                    |

## 快速决策

| 用户意图                | 首选命令 / 路由                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 检查 CLI 是否可用或版本 | `hithink-finance version --format json`                                                                                                                                       |
| 查看真实能力清单        | `hithink-finance capabilities --format json`                                                                                                                                  |
| 查看某个命令参数契约    | `hithink-finance schema <capability-id> --format json`                                                                                                                        |
| 获取并保存 API Key      | 先打开 https://fuyao.aicubes.cn/admin 获取 API Key，再运行 `hithink-finance auth login --api-key-stdin --format json`；交互终端也可运行 `hithink-finance auth login` 隐藏输入 |
| 检查认证状态            | `hithink-finance auth status --format json`                                                                                                                                   |
| 查看非敏感配置          | `hithink-finance config show --format json`                                                                                                                                   |
| 诊断运行环境            | `hithink-finance doctor --format json`                                                                                                                                        |
| 同步/修复配套 Skills    | `hithink-finance skills status --format json` 或 `hithink-finance skills sync --format json`                                                                                  |
| 更新 CLI                | `hithink-finance update --check --format json` 或 `hithink-finance update --repair --format json`                                                                             |
| 预览卸载                | `hithink-finance uninstall --plan --format json`                                                                                                                              |

## References

| 需要了解                           | 读取                                                    |
| ---------------------------------- | ------------------------------------------------------- |
| JSON 输出、大结果、安全规则        | [global-rules.md](references/global-rules.md)           |
| API Key、profile、配置优先级       | [auth-and-config.md](references/auth-and-config.md)     |
| version、doctor、update、uninstall | [lifecycle.md](references/lifecycle.md)                 |
| skills status/sync/remove          | [skills-management.md](references/skills-management.md) |

## 权限表

| 能力                                                         | 凭据                                              |
| ------------------------------------------------------------ | ------------------------------------------------- |
| 本地 data/db/market panel                                    | 通常不需要 API Key，除非需要同步或初始化远端 dump |
| symbol/market remote/special/financials/index/fund/valuation | 需要统一 API Key                                  |
| skills/update/uninstall                                      | 需要本机文件系统权限；不要写全局非 CLI 管理目录   |

## 边界声明

- 业务取数请求必须切到 symbol、market、special-data、financials、index、fund、valuation、data 或 research skill。
- 不要把 API Key 写入命令、配置文件、日志、Markdown、Git 或对话正文；优先 stdin 或系统凭据库。
- 不要把 stderr 更新提示、诊断详情或完整大数据结果当作最终答案原样展开。
