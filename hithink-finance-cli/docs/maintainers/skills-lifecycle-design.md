# CLI 配套 Skills 安装与更新方案

状态：已实施（本地验证中）。本文中的契约已由 CLI 生命周期实现、命令帮助、生成的配套 Skill 文档和统一总 Skill 同步；真实客户端发现与跨平台安装验证仍须按下文验收项分别记录。

## 目标与范围

用户安装 CLI 后，已安装的主流 Agent 能发现配套 Skills；升级 CLI 后，Skills 自动保持同版本。用户可以限定目标 Agent，后续添加新 Agent；多个 Agent 共享内容，通过目录链接降低磁盘占用。

本方案管理 CLI 包内 manifest 声明的配套 Skills。跨 REST/MCP/CLI/Python 的统一 `hithink-finance` Skill 保持独立发布，其 CLI 引导需同步说明新增命令。配套 `hithink-finance-shared` 负责引导安装、同步和故障处理。

## 当前实现依据

- [postinstall.mjs](../../scripts/postinstall.mjs) 调用包内 `skills sync --repair --yes --format json`，并标记为安装生命周期同步，不会重新启用已禁用策略。
- [lifecycle.ts](../../src/infrastructure/skills/lifecycle.ts) 维护有限 Agent 适配表、逐目标所有权 manifest、目标父级链接检查、共享内容发布、目录链接/复制模式和进程锁；不再依赖外部 `skills add` 扩散到未知目标。
- WorkBuddy 和 QClaw 继续使用 `.workbuddy/skills`、`.qclaw/skills` 路径适配，并可将已验证且未修改的旧托管副本迁移为共享链接。正式名称和参数标识为 QClaw / `qclaw`。
- [Skills 命令组](../../src/commands/skills/index.ts) 已提供 `status`、`sync`、`remove` 及 `--agent`、`--directory`、`--copy`；status 报告包内内容、策略、所有权和逐目标验证状态。

## 首批 Agent

| 客户端             | 参数标识          | 适配要求                                |
| ------------------ | ----------------- | --------------------------------------- |
| Codex              | `codex`           | 尊重客户端配置目录覆盖                  |
| Claude Code        | `claude-code`     | 尊重客户端配置目录覆盖                  |
| Cursor             | `cursor`          | 检测客户端实际配置                      |
| Gemini CLI         | `gemini-cli`      | 检测客户端实际配置                      |
| OpenCode           | `opencode`        | 尊重平台配置目录                        |
| GitHub Copilot CLI | `github-copilot`  | 检测客户端实际配置                      |
| Trae               | `trae`、`trae-cn` | 区分国际版与国内版                      |
| WorkBuddy          | `workbuddy`       | 复用现有 `~/.workbuddy/skills` 路径适配 |
| QClaw              | `qclaw`           | 复用现有 `~/.qclaw/skills` 路径适配     |

表中路径的 `~` 表示用户主目录。实现阶段逐一验证客户端发现规则与链接兼容性；已有复制适配不能证明链接已被客户端支持。

## 用户可见命令与策略

### 首次安装

默认安装命令保持不变：

```bash
npm install -g hithink-finance
```

首次安装默认采用 `auto` 策略：检测首批支持的客户端，为实际检测到的目标建立链接。没有检测结果时保留包内 Skills，不创建 Agent 根目录；状态显示“等待添加 Agent”。

首次限定目标通过进程环境变量 `HITHINK_FINANCE_SKILLS_AGENTS` 传入，值为 `auto` 或逗号分隔的标识。npm 自定义参数不作为正式入口。

PowerShell 示例：

```powershell
$env:HITHINK_FINANCE_SKILLS_AGENTS = "codex,workbuddy"
try {
  npm install -g hithink-finance
} finally {
  Remove-Item Env:HITHINK_FINANCE_SKILLS_AGENTS
}
```

该示例适用于原先未设置该变量的终端；已有值时应保存并恢复。安装器保存目标策略，后续升级无需重复设置变量。仅非空且全部合法的值生效；未知名称报出可用标识，不扩大安装范围。

显式指定目标构成向该客户端约定位置安装的意图，因此即使检测不到客户端，也允许创建该指定目标的 Skills 目录。自动模式仅向检测到的目标安装。

### 安装后的同步与移除

```bash
# 按已保存策略同步，并修复托管链接
hithink-finance skills sync

# 添加一个或多个目标；保留已有目标
hithink-finance skills sync --agent claude-code
hithink-finance skills sync --agent workbuddy --agent qclaw

# 切换为自动检测模式，保留已有显式添加的目标
hithink-finance skills sync --agent auto

# 查看本机检测、策略、版本和逐目标状态
hithink-finance skills status
hithink-finance skills status --format json

# 移除一个目标的托管链接，并阻止自动模式再次添加
hithink-finance skills remove --agent codex
```

`sync --agent <名称>` 表示追加目标，不表示替换。再次显式同步某个已移除目标，会解除其排除状态。`auto` 不与具体名称混用。

持久化策略包含模式、显式目标和排除目标。自动模式有效目标为“本次检测结果 + 显式目标 − 排除目标”；指定模式有效目标为“显式目标 − 排除目标”。安装/升级环境变量有值时替换目标策略，无值时继承。移除全部配套 Skills 后保存禁用状态，避免升级立即重装；用户执行 sync 才重新启用。

对高级用户提供一个自定义位置入口：`skills sync --agent <名称> --directory <绝对路径>`，仅允许单个具体 Agent，保存路径供后续更新使用。路径必须是该 Agent 实际读取的 Skills 根目录。实现时同步补充 schema 和帮助信息。

## 生命周期与共享链接

安装、升级和手动 sync 复用同一个同步流程：读取包内 manifest → 解析策略 → 检测与解析目标 → 准备共享内容 → 建立或修复链接 → 验证并记录结果。

共享内容存放在 CLI 用户级数据目录下的 `skills` 区域；Agent 目录内逐个 Skill 建立链接，不替换整个 `skills` 根目录。

```text
CLI 用户级数据目录 / skills / 当前内容
  ├─ hithink-finance-shared
  └─ hithink-finance-market
             ↑              ↑
Codex / skills / 同名链接   WorkBuddy / skills / 同名链接
```

- macOS/Linux 使用目录 symlink；Windows 优先使用目录 junction，验证跨卷和权限行为。
- 默认只维护一份共享内容，加上 npm 包内的分发内容；不会随 Agent 数量生成完整副本。
- 链接失败时报告具体目标与修复方式。需要复制兼容时允许显式 `--copy`，并持久化该目标的模式，升级仍自动同步。
- 包内内容作为唯一更新来源，Skills 与 CLI manifest 版本和哈希一致；生命周期同步不额外下载 Skills。
- npm 禁用生命周期脚本时，自动同步无法执行，使用 `skills sync` 补齐；客户端可能需要刷新或新建会话才能发现新增 Skills。

新内容先在暂存位置完整校验，再发布到共享位置。发布与链接修复使用互斥控制，防止并发 sync；保留旧内容直到切换和验证完成，失败时恢复。不得将跨平台目录替换假定为无间隙原子操作，需验证更新期间的读访问及 Windows 文件占用场景。旧版本仅在迁移完成后清理，不长期累积多版本副本。

## 检测与托管边界

CLI 维护有限 Agent 适配表，统一客户端标识、检测依据、目标路径和链接能力。`rosie-skills` 的公开 `agents()` 可作为检测候选，接入前验证名称映射、路径覆盖和误判；本方案不以它作为必选依赖。

自动检测区分“发现客户端配置证据”与“只有本项目生成的 Skills 目录”。尤其不能把旧版批量创建的目录重新认定为已安装客户端。结合客户端特有配置、程序位置等信号；无法确定时不自动创建目标，显式选择仍可安装。

记录每个托管目标的路径、链接模式、来源和同步结果。只更新本项目拥有的链接或文件；第三方目录、用户修改的副本保留并报告冲突。`--repair` 修复托管内容，不等于允许覆盖未知内容。

升级迁移旧复制目录时：有托管记录且内容哈希匹配的副本可自动转为链接；内容已修改或来源不明时保留并报告。对历史无效目录仅提供范围明确的清理预览，不能因检测不到客户端直接删除整个 Agent 根目录。

通过 CLI 卸载流程移除托管链接和共享内容。直接 `npm uninstall -g` 的清理能力需单独验证，不能承诺 npm 一定调用清理钩子；公开卸载文档需给出先移除配套 Skills 的顺序。

## 交互实例

以下为目标体验，示例中的成功状态均要求实际检查目标内容后才能输出。

### A. 普通用户已安装 Codex、WorkBuddy、QClaw

用户只运行 `npm install -g hithink-finance`。安装器自动为这三个 Agent 建立链接，其他 Agent 目录不会创建。成功路径不增加问答或冗长输出。

随后运行 `hithink-finance skills status`，可看到：

```text
策略：自动检测
Skills：与当前 CLI 一致
Codex       就绪  链接
WorkBuddy   就绪  链接
QClaw       就绪  链接
```

状态中的“就绪”指文件与链接验证通过，不声称客户端已经加载。必要时新建 Agent 会话即可发现 Skills。

### B. 用户只希望 Codex 使用 Skills

安装时设置 `HITHINK_FINANCE_SKILLS_AGENTS=codex`。即使机器上还有 WorkBuddy，安装器只为 Codex 安装；升级时继续保持该选择。

### C. 后来安装 Claude Code

在场景 B 的基础上，用户运行 `hithink-finance skills sync --agent claude-code`。系统为 Claude Code 添加链接，保留 Codex，并保存这两个目标。之后升级会自动同步两者。

用户也可以对已能读取统一 Skill 的 Agent 说“给 Claude Code 同步金融数据 Skills”，由 Agent 根据说明执行同一命令。全新 Agent 尚未加载任何相关 Skill 时，可通过 CLI 帮助发现命令，不能依赖它自行读取尚未安装的配套 Skill。

### D. 升级 CLI

用户运行 `npm install -g hithink-finance@latest`，或使用 CLI 已有升级命令。新 CLI 发布共享内容、检查链接，所有已选目标使用同一新版 Skills。用户不再逐个 Agent 执行更新。

若一个目标发生权限错误，其他成功目标仍如实记录；安装结束仅给一条简短提示，例如“Claude Code Skills 同步未完成；运行 hithink-finance skills sync 重试”。手动 sync 在部分失败时返回非零退出码；status 显示失败目标及旧版状态。

### E. 尚未安装任何 Agent

CLI 正常安装，不生成一批 Agent 目录。随后安装 WorkBuddy，运行 `hithink-finance skills sync`，默认自动策略发现它并建立链接。若原来使用指定策略，则运行 `skills sync --agent workbuddy` 添加。

## 用户与 Agent 的说明和指引

新逻辑的实现必须同时交付仓库 README、CLI help 和统一 `hithink-finance` 总 Skill 的说明，使用户和首次接入的 Agent 都能发现并理解安装规则。说明随功能发布，不作为发布后的补充任务。

| 入口                                                                                        | 必须说明的内容                                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [仓库 README](../../../README.md)                                                           | 在 CLI 安装入口说明默认自动安装、升级自动同步、按已安装 Agent 选择目标、默认链接共享；提供首次指定目标和后续新增 Agent 的最短示例，并链接 CLI 详细说明           |
| [CLI README](../../README.md)                                                               | 完整说明支持的 Agent、环境变量、策略持久化、追加目标、自定义目录、链接与复制、状态检查、修复和移除；提供安装、升级、新增客户端的连贯示例                         |
| CLI `--help` 与 `skills --help`                                                             | 顶层 help 可发现 Skills 管理入口；命令组 help 简述默认安装及升级行为，并指向 status、sync、remove                                                                |
| CLI `skills status/sync/remove --help`                                                      | 说明各参数的准确语义、合法 Agent 标识和示例，尤其明确追加目标、auto 模式、排除目标、目录覆盖及复制选择；说明失败后的下一步操作                                   |
| [统一 hithink-finance 总 Skill](../../../skills/hithink-finance/SKILL.md) 及其 CLI 引用文档 | 说明 CLI 与配套 Skills 的关系、自动安装更新规则、目标选择和当前 Agent 缺失 Skills 时的处理流程；引导 Agent 检查状态、为自身或用户指定的新 Agent 同步，并验证结果 |
| 配套 hithink-finance-shared、CLI capabilities/schema                                        | 同步提供操作指引与机器可读参数契约，确保 Agent 能按实际命令执行                                                                                                  |

各入口保持相同的默认行为与参数语义，详细参数集中在 CLI 帮助和 CLI README 中，总览及总 Skill 提供必要解释、示例和直接链接。配套 Skills 随 CLI 更新，总 Skill 的独立发布与更新机制需说明清楚。

统一 Skill 中的目标引导示例：用户说“我新安装了 Claude Code，也想使用金融数据 CLI”时，Agent 应能获知并执行 `hithink-finance skills sync --agent claude-code`，理解该操作保留原有目标，并检查 Claude Code 对应的同步状态。用户未指定目标时，先识别当前 Agent；无法确定时通过 help 或必要询问确定目标，不扩大到所有客户端。

说明还应覆盖自动同步的实际边界：未检测到客户端、npm 禁用安装脚本、链接失败，以及需要客户端刷新或新建会话的情况，并分别给出可执行的下一步指引。

## 实施交付与验收

实现顺序：统一目标策略与检测 → 共享内容和链接管理 → 安装/升级生命周期接入 → 旧副本迁移 → CLI 命令、schema、统一 Skill 和配套 Skill 文档同步。

必须验证：

1. 空环境不创建 Agent 根目录；历史遗留的仅 Skills 目录不导致误检测。
2. 指定 Codex 时只安装 Codex；追加 Claude 后两者均保留，升级继承选择。
3. WorkBuddy/QClaw 实际客户端能够发现并读取目录链接中的 Skills。
4. 多 Agent 默认共享内容；链接损坏可修复，显式复制模式可持续更新。
5. 更新失败、并发同步、Windows 文件占用时旧内容可恢复，状态不误报成功。
6. 用户修改、未知来源冲突、指定路径、移除排除规则和旧副本迁移符合契约。
7. 在 Windows/macOS/Linux 验证安装与升级；文件级验证和真实 Agent 发现验证分别记录。
8. 仓库 README、CLI README、各级 help、总 Skill、配套 Skill 和 schema 对默认策略、参数与更新行为的描述一致，示例可执行、相对链接有效。
9. 用户仅阅读仓库 README 即可完成首次安装和新增 Agent；尚未加载配套 Skills 的 Agent 通过总 Skill 或 CLI help 即可发现同步命令、理解追加语义并验证目标状态。

功能与上述说明、指引和验证一并交付；实际发布并确认后再更新 Issue 的解决状态。

## 实施记录（2026-09-14）

- 实现了持久化 `auto` / 指定 / 禁用策略、显式目标和排除目标；安装环境变量可替换策略，命令行 `sync --agent` 追加目标。
- 支持 Codex、Claude Code、Cursor、Gemini CLI、OpenCode、GitHub Copilot CLI、Trae、WorkBuddy 和 QClaw。自动检测不将仅有历史 `skills` 目录认作客户端安装证据。
- 共享内容发布到 CLI 用户级数据目录；每个 Agent 使用逐 Skill 目录链接，Windows 使用 junction，其他平台使用 symlink。`--copy` 和 `--directory` 为一个显式目标保存兼容策略。
- 同步使用进程互斥锁；新内容在临时目录通过 manifest 校验后发布，发布失败会恢复旧内容。逐目标同步、冲突、移除和状态文件验证都只触及 CLI 管理的路径；父级链接和移除所有权冲突会明确失败并保留用户内容。
- 已完成隔离临时用户目录的文件级测试，包括空环境、历史目录误检、显式追加、共享链接、复制模式、链接修复和移除排除规则；CLI help、capabilities/schema、生成契约和文档同步由相应测试与构建验证。
- 尚未完成真实 WorkBuddy/QClaw 客户端加载验证，以及 macOS/Linux 上的实际全局安装与升级验证；本记录不把文件级 `ready` 状态表述为客户端已加载。
