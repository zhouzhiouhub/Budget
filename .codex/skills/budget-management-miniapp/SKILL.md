---
name: budget-management-miniapp
description: "预算管理小程序项目级 skill。用于本仓库每次编码任务，以及任何涉及预算领域建模、金额计算、支出记录、预算扣减、超预算处理、微信小程序页面、云函数、未来 UniApp/Vue 迁移，或 Cloudflare Worker/Hono/D1 后端设计的工作。"
---

# 预算管理小程序 Skill

## 概览

将本 skill 作为预算管理小程序的项目级领域指南。只要 `AGENTS.md` 要求加载本 skill，就把它视为本仓库所有工作的默认规则。

当前仓库仍是原生微信小程序云开发 quickstart。除非用户明确要求迁移，否则实现必须兼容现有 `miniprogram/` 与 `cloudfunctions/` 结构。

## 启动流程

开始实现前：

1. 判断需求涉及 UI、预算领域逻辑、持久化、云函数还是项目工具链。
2. 先检查相关现有文件，再创建新文件。
3. 尽量复用现有页面、组件、资源、服务和工具函数。
4. 如果用户要求的技术栈尚未出现在仓库中，选择与当前仓库兼容的最小变更，并说明迁移假设。
5. 不要把预算计算和持久化决策写在页面事件处理函数里。

## 核心领域

预算管理围绕以下概念：

- `User`：个人预算数据的拥有者。
- `Organization`：共享预算的可选企业或团队作用域。
- `Budget`：某个周期的预算计划，例如 `2026-07`。
- `BudgetCategory`：某个预算内的分类额度，例如餐饮、交通、办公、娱乐。
- `Transaction`：可审计的资金流水，类型包括 `income`、`expense`、`transfer`、`refund`、`adjustment`。
- `ExpenseRecord`：用户可见的支出记录，通常触发预算扣减。
- `BudgetMutation`：预算变化审计记录，用于扣减、退款、调整和追加预算。

推荐记录字段：

```text
user: id, name, avatar
budget: id, user_id, organization_id, period, total_amount_yuan, used_amount_yuan, created_at, updated_at
budget_category: id, budget_id, category_id, amount_yuan, used_amount_yuan, created_at, updated_at
expense_record: id, user_id, organization_id, category_id, amount_yuan, remark, occurred_at, created_at, updated_at
```

## 金额规则

金额单位统一使用“元”。用户输入、界面展示、字段命名、持久化和业务语义都按元表达：

```text
人民币 100.00 元
人民币 12.50 元
```

推荐字段命名使用 `_yuan` 后缀：

```text
amount_yuan
total_amount_yuan
used_amount_yuan
remaining_amount_yuan
```

持久化规则：

- 优先保存为两位小数字符串，例如 `"100.00"`、`"12.50"`。
- 如果数据库支持精确 decimal 类型，可使用 `DECIMAL(12,2)` 等精确类型。
- 不要保存为其他金额单位；金额字段统一使用 `_yuan` 后缀。

金额校验规则：

- 允许整数金额，例如 `100`，保存或展示时格式化为 `100.00`。
- 允许一位或两位小数，例如 `100.0`、`100.00`、`12.50`。
- 不允许超过两位小数，例如 `12.345`。
- 保存前必须校验并规范化为两位小数的元金额。

避免用 JavaScript 浮点数直接计算金额：

```js
// 金额计算不要这样写
const total = 0.1 + 0.2
```

使用 decimal 库或等价精确十进制方案做金额计算：

```js
const remainingAmountYuan = Decimal(budgetAmountYuan).minus(usedAmountYuan).toFixed(2)
```

所有金额加减乘除、用户输入解析和展示格式化都必须走精确十进制方案。

## 预算计算

剩余预算：

```text
remaining_amount_yuan = amount_yuan - used_amount_yuan
```

使用率：

```text
used_rate = Decimal(used_amount_yuan) / Decimal(amount_yuan)
```

必须处理零预算除法。如果 `amount_yuan` 为 `0.00`，返回明确状态，不要产生 `NaN` 或 `Infinity`。

预算状态：

- `normal`：使用率 `< 80%`。
- `warning`：使用率 `>= 80%` 且 `<= 100%`。
- `over_budget`：使用率 `> 100%`。

## 支出扣减流程

创建支出时：

1. 校验金额、分类、所属用户或组织作用域、预算周期。
2. 查找匹配且有效的 `BudgetCategory`。
3. 在变更前计算剩余额度。
4. 如果支出超过剩余额度，必须进入显式超预算处理，不允许静默通过。
5. 平台支持事务或类事务语义时，将支出记录和预算变更一起持久化。
6. 更新分类和预算的 `used_amount_yuan`，并保持两位小数。
7. 返回更新后的汇总数据，便于 UI 刷新。

超预算处理必须：

- 提示用户。
- 记录超预算金额。
- 支持显式确认、追加预算或预算调整。

## 前端实现

针对当前原生微信小程序：

- `pages/**/index.js` 只负责生命周期、事件处理和状态绑定。
- 格式化、校验和预算计算逻辑放入 `miniprogram/utils/` 或 `miniprogram/services/`。
- 随着应用增长，`components/` 放公共 UI，`features/` 放预算领域组件。
- 远程数据和表单提交必须包含 loading、空状态、错误状态和成功状态。
- `index.wxml` 保持声明式，不在模板中嵌入业务决策。

产品增长后的主要页面预期：

```text
首页
预算
记账
分析
我的/设置
```

Dashboard 优先展示总预算、已使用、剩余金额、分类排行和趋势图。

如果用户明确要求 UniApp/Vue：

- 使用 Vue 3、TypeScript、Composition API 和 uView Plus。
- 共享类型和领域工具函数必须放在页面组件之外。
- 图表使用 ECharts，日期使用 Day.js，小数金额场景按需使用 Decimal.js。

## 后端与持久化

针对当前微信云函数：

- 非平凡云函数拆分为请求处理、service 业务逻辑、repository/database 数据访问。
- 云数据库集合命名保持小写、领域化。
- 读取或修改预算数据前必须校验用户作用域。

如果用户明确要求 Cloudflare：

- 使用 Cloudflare Worker + Hono 路由 + D1 持久化。
- 后端结构采用 Controller -> Service -> Repository -> Model。
- schema 变更使用 migration。
- 不要在 migration 或明确维护任务之外直接修改生产数据。

未来 REST API 形态：

```text
POST /api/budgets
GET /api/budgets/:period
POST /api/expenses
GET /api/analytics/:period
```

## 安全与隔离

- 将预算数据视为私密财务数据。
- 所有读写必须要求已认证用户。
- 组织级记录必须包含 `organization_id`。
- 查询时不要在没有显式作用域过滤的情况下混用个人数据和组织数据。
- 不要向用户暴露内部标识、堆栈信息或实现细节错误。

## 功能检查清单

新增预算功能时，检查以下相关项：

- 领域字段中的金额单位统一为元，使用两位小数和精确十进制计算。
- 计算逻辑已隔离，便于独立测试。
- UI 包含 loading、空状态、错误状态和成功状态。
- 持久化逻辑强制用户或组织作用域。
- 超预算行为是显式且可审计的。
- 除非任务是清理或迁移，否则保留现有 quickstart 文件。



