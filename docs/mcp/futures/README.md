# 期货

[全部业务域](../README.md)

先确定品种或合约，再查询持仓、仓单、基差、交易日程与行情。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货合约详情](get_futures_contracts_detail.md) | `get_futures_contracts_detail` | 公开 |
| [期货品种资料](get_futures_varieties_list.md) | `get_futures_varieties_list` | 公开 |

## 行情

查询分时走势选择期货分时行情，查询日线选择期货日 K。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货日K](get_futures_prices_daily.md) | `get_futures_prices_daily` | 公开 |
| [期货分时行情](get_futures_prices_intraday.md) | `get_futures_prices_intraday` | 公开 |

## 交易日程

交易日、交易时段与会话时间。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货交易日](get_futures_calendar_trading_schedule.md) | `get_futures_calendar_trading_schedule` | 公开 |

## 持仓

品种与公司、合约维度不同；日期查询和历史序列分别选择。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货公司列表](get_futures_positions_company_list.md) | `get_futures_positions_company_list` | 公开 |
| [期货公司品种日持仓](get_futures_positions_company_variety_daily.md) | `get_futures_positions_company_variety_daily` | 公开 |
| [期货公司合约日持仓](get_futures_positions_contract_daily.md) | `get_futures_positions_contract_daily` | 公开 |
| [期货公司合约历史持仓](get_futures_positions_contract_historical.md) | `get_futures_positions_contract_historical` | 公开 |
| [期货品种日持仓](get_futures_positions_variety_daily.md) | `get_futures_positions_variety_daily` | 公开 |

## 基差

最新主连基差与指定合约历史基差。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货历史基差](get_futures_basis_historical.md) | `get_futures_basis_historical` | 公开 |
| [期货主连最新基差](get_futures_basis_main_continuous_latest.md) | `get_futures_basis_main_continuous_latest` | 公开 |

## 仓单

历史仓单与变化。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [期货历史仓单](get_futures_warehouse_receipts_historical.md) | `get_futures_warehouse_receipts_historical` | 公开 |
