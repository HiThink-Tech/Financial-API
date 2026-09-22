# research workflow

## 前置条件

- 先读取 [hithink-finance-shared](../../hithink-finance-shared/SKILL.md)。
- 确认用户要的是中立研究数据、统计或可复现实证输入，不是投资建议。
- 先用文件系统确认用户指定的数据库文件存在，并固定绝对路径。文件不存在时报告缺失；初始化由 data Skill 按用户授权执行。
- 文件存在后运行带同一 `--db` 的 `data status`，再运行 `data migrate` 的默认计划。版本不兼容或 `data.versions` 非空时停止研究前置调用，说明需要迁移；计划不带 `--apply`。
- 仅在迁移计划为空时运行 `data validate`。该命令会应用普通迁移，不能用于探测未知库。质量通过要求外层 `ok=true` 且 `data.ok=true`；否则读取 `data.issues` 的 code/count。

## 命令

```bash
hithink-finance data status --db "<absolute-db-path>" --format json
hithink-finance data migrate --db "<absolute-db-path>" --format json
```

确认计划为空后才继续：

```bash
hithink-finance data validate --db "<absolute-db-path>" --format json
hithink-finance db query --db "<absolute-db-path>" --sql "SELECT count(*) AS rows, min(date) AS start_date, max(date) AS end_date FROM v_daily_qfq" --format json
```

质量与请求窗口、样本核对通过后导出：

```bash
hithink-finance market panel --db "<absolute-db-path>" --start <YYYY-MM-DD> --end <YYYY-MM-DD> --output <panel.parquet> --file-format parquet --format json
hithink-finance db export --db "<absolute-db-path>" --sql "<readonly sql>" --output <result.parquet> --file-format parquet --format json
```

## 参数选择策略

- 小样本探索用 `db query`，并在 SQL 中显式 `LIMIT`。
- 下游分析、全市场、长区间、多因子结果用 `db export` 或 `market panel`。
- 研究报告必须记录 SQL、时间窗口、库路径或输出文件路径、行数。
- 按用户要求筛选并检查每个目标标的的日期覆盖与样本数；全库 min/max 仅是初步概览。空库也可能质量通过，不能代替样本验收。

## 常见错误

- 不要把相关性、排序或榜单解释成买卖建议。
- 不要在研究 skill 中临时取实时榜单；切到对应业务 skill 后再把结果作为证据。
- 研究 SQL 必须只读；需要表结构时通过 db query 查询 information_schema，db describe 会应用普通迁移。

## 批量操作说明

- 分批导出时给每批文件命名，最终合并前按 `thscode/date` 等主键去重。
- 最终回答只摘要统计结果和证据路径，不粘贴大表。
