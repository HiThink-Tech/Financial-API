# MCP 接入与工具路由

已连接 MCP 的 Agent 先按用户意图选择业务域，再读取对应文档。业务域文档按工具保留名称、描述、入参和响应摘要；当前连接的 `tools/list` 和工具 schema 优先于静态文档，决定工具是否可用及其实际契约。若工具不在当前列表中，不按静态文档构造调用。

| 业务域 | 客户端服务名 | 地址 | 路由 |
| --- | --- | --- | --- |
| 标的搜索与代码表 | `hithink-finance-meta` | `https://fuyao.aicubes.cn/mcp/meta` | [基础数据](mcp/meta.md) |
| A 股行情、财务、竞价与特色数据 | `hithink-finance-a-share` | `https://fuyao.aicubes.cn/mcp/a-share` | [A 股](mcp/a-share.md) |
| 指数与板块 | `hithink-finance-a-share-index` | `https://fuyao.aicubes.cn/mcp/a-share-index` | [指数](mcp/index.md) |
| 公募基金 | `hithink-finance-fund` | `https://fuyao.aicubes.cn/mcp/fund` | [基金](mcp/fund.md) |
| 期货 | `hithink-finance-futures` | `https://fuyao.aicubes.cn/mcp/futures` | [期货](mcp/futures.md) |
| 期权 | `hithink-finance-options` | `https://fuyao.aicubes.cn/mcp/options` | [期权](mcp/options.md) |

用户只给名称、简称或不完整代码时，先在基础数据域消歧为唯一 `thscode`。只检查本次需要的服务和工具；调用前读取目标工具的实时 schema，不重复加载全部工具定义。分页全集、全市场或长序列结果应落盘，只向会话返回摘要。

## 连接与认证

六个端点共用在 <https://fuyao.aicubes.cn/admin/> 获取的 API Key，HTTP MCP 客户端通过 `X-api-key` 请求头传递。推荐从用户级 `HITHINK_FINANCE_API_KEY` 插值；客户端不继承环境变量时，从已配置的统一凭据来源写入客户端 Secret。

业务成功需检查响应信封 `code=0`。认证失败时先检查客户端是否传入 Key，再检查已有凭据来源；更新后重连目标服务并做最小有界验证。静态路由不能证明会话已连接或账号具有权限。
