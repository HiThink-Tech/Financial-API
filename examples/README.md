# examples/

可直接 `python3` 跑的端到端样例。第一次上手本仓库就从这里开始 —— 不用读完整 toolkit 文档，跑完三个脚本对仓库能干什么 / 怎么用就有完整画面。

## 前提

```bash
# 1. 装包并构建本地 DB（一次性）
python bootstrap.py

# 2. 确认本地 DB 有数据
marketdb status --db data/market.duckdb

# 3.（可选，仅 example 03 需要）配置同花顺金融数据 API token
export FUYAO_TOKEN=<token>     # 在 https://fuyao.aicubes.cn/admin 签发
```

跑脚本时**当前目录要在仓库根**（即本 README 的上一级）：

```bash
cd /path/to/Financial-API
python3 examples/01_quickstart.py
```

---

## 样例清单

| # | 脚本 | 用到的 toolkit | 学到什么 | 要 token？ |
| --- | --- | --- | --- | --- |
| 01 | [`01_quickstart.py`](01_quickstart.py) | `toolkit/marketdb` | SDK 单股 `get_daily`、前复权、基本统计 | ❌ |
| 02 | [`02_cross_section.py`](02_cross_section.py) | `toolkit/marketdb` | 全市场截面 `get_panel`、按 ADV 选股、大结果落盘 | ❌ |
| 03 | [`03_fundamentals_join.py`](03_fundamentals_join.py) | `toolkit/marketdb` + `toolkit/fuyao` | 跨 toolkit 组合：财报（远端 API CLI）+ 行情（marketdb SDK） | ✅ |

每个脚本都自带顶部 docstring，说明它在演示什么。

---

## 01 · 单股近一年走势 + 统计指标

```bash
python3 examples/01_quickstart.py
```

输出（节选）：

```
[quickstart] fetching 300033.SZ from 2025-06-12 to 2026-06-12 (qfq) ...
[quickstart] got 243 trading days

summary stats (qfq close):
  trading days   : 243
  period          : 2025-06-12 → 2026-06-11
  start close     : 179.88
  end close       : 193.04
  total return    : 7.32%
  max drawdown    : -33.47%
  annualised vol  : 48.42%
```

这是用 `MarketDB.get_daily(thscode, start, end, adjust="forward")` 的最小示例。看完代码就懂 SDK 的 90%。

## 02 · 全市场截面 + ADV 排名

```bash
python3 examples/02_cross_section.py
```

它会：

1. 用 `db.get_panel(start, end)` 一次顺序扫拉全市场近 5 周面板（约 50 万行）
2. 整个 panel 落到 `out/panel_<start>_<end>.parquet` —— 大结果**不进 stdout**，符合 toolkit 的大数据纪律
3. pandas 按 thscode 算 20 日均额（ADV）+ 5 日涨跌幅
4. 打印 top-50 表格 + 落 `out/top_adv_<date>.csv`

学到的是 `get_panel` vs `get_daily(list)` 的取舍：N 大时永远用 `get_panel`。

## 03 · 跨 toolkit 组合：财报 × 行情

```bash
export FUYAO_TOKEN=<token>
python3 examples/03_fundamentals_join.py
```

演示的范式：

- `toolkit/fuyao/scripts/fuyao.py financials-income` —— 通过 CLI 拉年报利润表（**通过 subprocess 调 CLI，不 import**，与 toolkit 的"工具无关 + CLI-only 输出"设计一致）
- `MarketDB.get_daily(thscode, adjust="forward")` —— 拉历史 qfq 行情
- `pd.merge_asof` —— 把每期财报对齐到最近的交易日

没设 token 时脚本不会报错，会跳过远端 API 部分只跑 marketdb 部分。

---

## 通用约定（这些样例都遵守）

- **路径**：所有相对路径都假设 cwd = 仓库根。
- **落盘目录**：大结果统一进 `out/`（已被 `.gitignore` 忽略）。
- **stdout 内容**：只打"汇总数字 + 文件路径"，不打全量行（避免 AI agent 用同样脚本时把上下文撑爆）。
- **错误**：DB 不存在 / token 缺失等"环境问题"在脚本开头明确报错，不静默继续。

---

## 自己改样例 / 加新样例

照着 `01_quickstart.py` 改最容易：换 `THSCODE`、换 `WINDOW_DAYS`、换 `adjust`。

加新样例时一并更新本 README 的"样例清单"表格。命名规则：`NN_<英文短名>.py`，编号按学习路径单调递增。

需要更细的能力 / 参数 / 错误码？

- 本地查询：[`../toolkit/marketdb/README.md`](../toolkit/marketdb/README.md)
- 远端 API：[`../toolkit/fuyao/README.md`](../toolkit/fuyao/README.md)
- 两个怎么配合：[`../toolkit/README.md`](../toolkit/README.md)
