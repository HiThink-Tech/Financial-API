# 期货

[全部业务域](../README.md)

先确定品种或合约，再查询持仓、仓单、基差、交易日程与行情。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货品种资料](varieties-list.md) | `GET /api/futures/varieties/list` | 公开 |
| [期货合约详情](contracts-detail.md) | `GET /api/futures/contracts/detail` | 公开 |

## 行情

查询分时走势选择期货分时行情，查询日线选择期货日 K。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货分时行情](prices-intraday.md) | `GET /api/futures/prices/intraday` | 公开 |
| [期货日K](prices-daily.md) | `GET /api/futures/prices/daily` | 公开 |

## 交易日程

交易日、交易时段与会话时间。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货交易日](calendar-trading-schedule.md) | `GET /api/futures/calendar/trading-schedule` | 公开 |
| [期货交易时间轴](calendar-session-timeline.md) | `GET /api/futures/calendar/session-timeline` | 端内专用，待上线 |

## 持仓

品种与公司、合约维度不同；日期查询和历史序列分别选择。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货品种日持仓](positions-variety-daily.md) | `GET /api/futures/positions/variety-daily` | 公开 |
| [期货公司品种日持仓](positions-company-variety-daily.md) | `GET /api/futures/positions/company-variety-daily` | 公开 |
| [期货公司合约日持仓](positions-contract-daily.md) | `GET /api/futures/positions/contract-daily` | 公开 |
| [期货公司合约历史持仓](positions-contract-historical.md) | `GET /api/futures/positions/contract-historical` | 公开 |
| [期货公司列表](positions-company-list.md) | `GET /api/futures/positions/company-list` | 公开 |

## 基差

最新主连基差与指定合约历史基差。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货主连最新基差](basis-main-continuous-latest.md) | `GET /api/futures/basis/main-continuous-latest` | 公开 |
| [期货历史基差](basis-historical.md) | `GET /api/futures/basis/historical` | 公开 |

## 仓单

历史仓单与变化。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货历史仓单](warehouse-receipts-historical.md) | `GET /api/futures/warehouse-receipts/historical` | 公开 |

## 端内扩展资料

端内品种板块、主连、主力与次主力合约、商品指数和 F10。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货F10宏观指标历史数据](fundamentals-indicators-historical.md) | `GET /api/futures/fundamentals/indicators-historical` | 端内专用，待上线 |
| [期货品种板块](variety-plates-list.md) | `GET /api/futures/variety-plates/list` | 端内专用，待上线 |
| [期货主连资料](contracts-main-continuous-list.md) | `GET /api/futures/contracts/main-continuous-list` | 端内专用，待上线 |
| [期货主力合约](contracts-main-list.md) | `GET /api/futures/contracts/main-list` | 端内专用，待上线 |
| [期货次主力合约](contracts-secondary-main-list.md) | `GET /api/futures/contracts/secondary-main-list` | 端内专用，待上线 |
| [商品指数合约列表](contracts-commodity-index-list.md) | `GET /api/futures/contracts/commodity-index-list` | 端内专用，待上线 |
