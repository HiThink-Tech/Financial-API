# 期权

[全部业务域](../README.md)

期权品种、合约与行情；按完整合约代码定位。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期权品种资料](varieties-list.md) | `GET /api/options/varieties/list` | 公开 |
| [期权合约详情](contracts-detail.md) | `GET /api/options/contracts/detail` | 公开 |

## 行情

查询分时走势选择期权分时行情，查询日线选择期权日 K。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期权分时行情](prices-intraday.md) | `GET /api/options/prices/intraday` | 公开 |
| [期权日K](prices-daily.md) | `GET /api/options/prices/daily` | 公开 |

## 交易日程

交易日、交易时段与会话时间。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期权交易时间轴](calendar-session-timeline.md) | `GET /api/options/calendar/session-timeline` | 端内专用，待上线 |
