# MCP 接入与 Agent 路由契约

同花顺金融数据服务提供 4 个托管 MCP 端点，适合 Claude Desktop、Cursor、Windsurf 等支持 HTTP MCP 的 Chat/Agent 客户端。四个端点共用在 <https://fuyao.aicubes.cn/admin> 获取的 API Key，无需在本地运行 MCP Server。

本页既是项目中的 MCP 主入口，也是 `hithink-finance` Skill 的内置入口契约。详细能力快照位于 [`docs/mcp/`](mcp/capability-map.md)，由脚本完整镜像到 Skill，Agent 不需要为了理解能力而加载官网长文档。

## 三个服务

| 客户端服务名 | 地址 | 职责 | 工具数 |
| --- | --- | --- | ---: |
| `hithink-finance-a-share` | `https://fuyao.aicubes.cn/mcp/a-share` | A 股行情、公司行为、财务、估值、日历和特色数据 | 17 |
| `hithink-finance-a-share-index` | `https://fuyao.aicubes.cn/mcp/a-share-index` | 指数/板块目录、成分和行情 | 4 |
| `hithink-finance-meta` | `https://fuyao.aicubes.cn/mcp/meta` | 标的搜索、名称消歧和代码表 | 2 |
| `hithink-finance-fund` | `https://fuyao.aicubes.cn/mcp/fund` | 基金资料、披露、净值、收益和场内行情 | 7 |

`hithink-finance-*` 是推荐写入客户端配置的本地服务名；URL 路径保持不变。

## 默认配置

不同客户端的配置文件位置和 Secret 插值语法不同。下面给出通用 HTTP MCP 结构，默认一次配置全部四个端点，之后由 Agent 按意图只调用需要的服务：

```json
{
  "mcpServers": {
    "hithink-finance-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-a-share-index": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share-index",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-meta": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/meta",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    },
    "hithink-finance-fund": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/fund",
      "headers": { "X-api-key": "${HITHINK_FINANCE_API_KEY}" }
    }
  }
}
```

`HITHINK_FINANCE_API_KEY` 是 REST、MCP、CLI 和 Python 共用的推荐变量。若客户端不继承用户级环境变量，由 Agent 从已经配置的统一凭据来源写入客户端 Secret，不要求用户重新提供；若客户端不支持环境变量插值，应使用它提供的 Secret/凭据功能。不得把真实 Key 写入仓库、Prompt、Issue、日志或可共享配置。

## Agent 决策流程

1. **先理解意图**：用 [能力与意图总览](mcp/capability-map.md) 选择服务和工具，不要先把三个服务全部探测一遍。
2. **先消歧再取数**：用户只给名称、ticker 或不完整代码时，先调用 `hithink-finance-meta` 的搜索工具确认唯一 `thscode`。
3. **只读取相关快照**：确定服务后，只加载对应的一份详细契约：
   - [A 股工具](mcp/hithink-finance-a-share.md)
   - [指数与板块工具](mcp/hithink-finance-a-share-index.md)
   - [标的元数据工具](mcp/hithink-finance-meta.md)
   - [基金工具](mcp/hithink-finance-fund.md)
4. **按需检查连接**：只有准备使用某个服务，或用户明确要求诊断连接时，才检查该服务是否连接并读取当前 `tools/list`。
5. **执行最小调用**：认证检查也使用目标任务所需的最小有界请求，禁止用省略标的的全市场快照做探针。
6. **控制结果规模**：分页全集、全市场、长时间序列或大量成分股必须落盘，只返回路径、行数和必要摘要。

Skill 中的能力快照用于意图识别、工具选择和参数避错；当前连接的 `tools/list` 只用于确认工具是否实际存在，以及调用时的参数名、类型、必填项和枚举是否发生变化。不要在每次请求前重复读取所有 schema。

## 认证与恢复

- 所有服务使用请求头 `X-api-key`。
- 业务成功条件是响应信封 `code=0`，不能只看 HTTP 200。
- `code=2003`、`Invalid or revoked API key`、401 或 403 通常表示 Key 缺失、无效、已撤销或客户端没有正确传递请求头。
- 认证失败时，先重新检查 `HITHINK_FINANCE_API_KEY` 和 Skill 的用户级凭据文件。仍未配置时，引导用户前往 <https://fuyao.aicubes.cn/admin> 创建 Key，并说明既可以按平台命令配置，也可以交给 Agent 代为安全配置；不得强制用户在对话中粘贴，也不得复述收到的 Key。
- 更新配置后通常需要重启或重连 MCP 客户端，再对目标服务执行一次最小验证。

## 能力边界

- 当前固化快照共 30 个 MCP 工具：A 股 17 个、指数 4 个、元数据 2 个、基金 7 个。
- MCP 适合 Chat 场景和自然语言调用；终端自动化、本地 DuckDB 与大结果工作流优先考虑 `hithink-finance` CLI。
- 当前快照不覆盖分钟 K、tick、Level-2、港股、美股、基金申赎交易、基金风险指标、期货、新闻、研报或回测引擎。
- 文档或静态快照不能证明当前会话已经连接，也不能证明账号具有相应权限；只有实际授权请求才能完成线上验证。
- 未支持能力必须明确说明，不得用近似数据、静态示例或模拟数据冒充。
