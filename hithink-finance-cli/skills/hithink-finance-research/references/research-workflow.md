# research workflow

## 前置条件

- 先读取 [hithink-finance-shared](../../hithink-finance-shared/SKILL.md)。
- 确认用户要的是中立研究数据、统计或可复现实证输入，不是投资建议。
- 本地库状态未知时先运行 `hithink-finance data status --format json` 和 `hithink-finance data validate --format json`。

## 命令

```bash
hithink-finance data status --format json
hithink-finance data validate --format json
hithink-finance market panel --start <YYYY-MM-DD> --end <YYYY-MM-DD> --output <panel.parquet> --file-format parquet --format json
hithink-finance db query --sql "<readonly sql>" --format json
hithink-finance db export --sql "<readonly sql>" --output <result.parquet> --file-format parquet --format json
```

## 参数选择策略

- 小样本探索用 `db query`，并在 SQL 中显式 `LIMIT`。
- 下游分析、全市场、长区间、多因子结果用 `db export` 或 `market panel`。
- 研究报告必须记录 SQL、时间窗口、库路径或输出文件路径、行数。

## 常见错误

- 不要把相关性、排序或榜单解释成买卖建议。
- 不要在研究 skill 中临时取实时榜单；切到对应业务 skill 后再把结果作为证据。
- 不要修改数据库；研究 SQL 必须只读。

## 批量操作说明

- 分批导出时给每批文件命名，最终合并前按 `thscode/date` 等主键去重。
- 最终回答只摘要统计结果和证据路径，不粘贴大表。
