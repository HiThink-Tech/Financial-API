# 期权会话时间轴

[业务导航](README.md)

> **info**
> 工具名：`get_options_calendar_session_timeline`
>
> 对应 REST 端点：[`GET /api/options/calendar/session-timeline`](../../api/options/calendar-session-timeline.md)


## 工具描述

> 查询期权合约所属交易会话时间轴。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约同花顺代码。 |

## 调用示例

```text
工具：get_options_calendar_session_timeline
参数：
  - thscode: "IO2601-C-4000.CFE"
```

## 返回

返回交易日期、时区、交易阶段与交易所会话时间范围。
