# BudgetFlow 智能预算管理平台开发计划书

## 1. 项目定位

BudgetFlow 是一个从个人预算管理逐步升级到企业部门预算管理的智能预算系统。第一阶段以个人预算 MVP 为核心，形成完整的「创建预算 -> 记录消费 -> 自动扣减 -> 超支提醒 -> 数据分析」闭环；后续扩展组织、部门、审批和 AI 分析能力。

## 2. 当前基线

当前仓库仍是微信小程序云开发 quickstart 结构，已经开始向预算管理小程序收敛：

- `miniprogram/`：当前小程序入口与页面资源。
- `cloudfunctions/`：现有微信云函数 quickstart，暂不作为最终后端形态。
- 已新增预算首页雏形、金额工具、预算服务边界和基础 README。

目标技术栈与当前结构存在差异，因此后续迁移按「先规划、再分阶段替换」执行，避免一次性重写导致功能不可验证。

## 3. 目标技术栈

| 模块 | 技术 |
| --- | --- |
| 小程序 | UniApp、Vue 3、TypeScript、uView Plus |
| 管理后台 | Vue 3、TypeScript、Naive UI |
| 后端 | Cloudflare Worker、Hono |
| 数据库 | Cloudflare D1 |
| 文件 | Cloudflare R2 |
| 图表 | ECharts |
| 测试 | Vitest、API 集成测试、关键流程手动验收 |

## 4. 目标 Monorepo 结构

```text
budget-system/
  apps/
    miniapp/        # UniApp 小程序
    admin/          # 企业管理后台
  server/           # Cloudflare Worker + Hono API
  packages/
    types/          # 共享领域类型
    utils/          # 金额、日期、预算计算等纯工具
  docs/             # 产品、架构、接口、数据库计划
  AGENTS.md
  SKILL.md
```

迁移原则：Phase 0 先建立目标目录和共享包，保留旧 `miniprogram/` 作为过渡参考；当 UniApp 小程序可运行后，再决定是否归档或移除旧 quickstart 目录。

## 5. 核心领域模型

```text
User
  -> BudgetPeriod
    -> ExpenseRecord
    -> BudgetMutation
    -> ExpenseType

Organization
  -> Department
  -> Member
  -> BudgetPeriod
  -> ApprovalFlow
```

核心实体：

- `User`：个人预算所有者。
- `Organization`：企业或团队空间。
- `Member`：组织成员与角色关系。
- `BudgetPeriod`：预算周期，例如 `2026-07`。
- `ExpenseType`：消费类型，例如餐饮、交通，仅用于流水分类和分析，不单独设置预算额度。
- `ExpenseRecord`：消费记录，触发预算扣减。
- `BudgetMutation`：预算变更审计记录，覆盖消费、退款、调整、追加预算。
- `Notification`：提醒与消息中心记录。
- `ApprovalFlow`：企业报销或预算申请审批流。

## 6. 金额与预算规则

MVP 产品裁剪：个人预算阶段只设置一个 `total_amount_yuan` 总预算。消费类型只用于记录、搜索和分析，不再为每个类型配置独立预算额度。

- 金额单位统一为元。
- 金额字段使用 `_yuan` 后缀，例如 `amount_yuan`、`used_amount_yuan`。
- 金额最多两位小数，进入业务逻辑前必须规范化为两位小数字符串。
- D1 中金额优先保存为 TEXT 两位小数字符串，例如 `"100.00"`，计算时使用 decimal 库或等价精确十进制方案。
- 不允许静默超支。超预算必须提示、记录超支金额，并提供追加预算或显式确认路径。

预算状态：

| 状态 | 条件 |
| --- | --- |
| normal | 使用率 `< 80%` |
| warning | 使用率 `>= 80%` 且 `<= 100%` |
| over_budget | 使用率 `> 100%` |

预算扣减流程：

```text
创建 ExpenseRecord
-> 读取当前 BudgetPeriod 总预算
-> 校验总剩余额度
-> 写入 BudgetMutation
-> 更新总 used_amount_yuan
-> 更新统计
-> 返回最新预算摘要
```

## 7. 数据库设计

MVP 表：

```text
users
budget_periods
expense_types
expense_records
budget_mutations
notifications
```

企业版新增表：

```text
organizations
organization_members
departments
role_permissions
expense_attachments
budget_adjustments
saving_goals
approval_flows
approval_steps
```

关键字段草案：

```text
users:
  id, openid, name, avatar_url, created_at, updated_at

budget_periods:
  id, user_id, organization_id, period, total_amount_yuan,
  used_amount_yuan, status, created_at, updated_at

expense_types:
  id, user_id, organization_id, type_key, name, created_at, updated_at

expense_records:
  id, user_id, organization_id, budget_period_id, expense_type_id,
  amount_yuan, remark, occurred_at, created_at, updated_at

budget_mutations:
  id, budget_period_id, expense_record_id,
  mutation_type, amount_yuan, before_used_amount_yuan,
  after_used_amount_yuan, over_budget_amount_yuan,
  created_by, created_at

notifications:
  id, user_id, organization_id, type, title, content,
  read_at, created_at
```

索引建议：

- `users.openid` 唯一索引。
- `budget_periods(user_id, period)` 唯一索引。
- `expense_types(user_id, type_key)` 普通索引。
- `expense_records(user_id, occurred_at)` 普通索引。
- `budget_mutations(budget_period_id, created_at)` 普通索引。

## 8. API 规划

MVP API：

```text
POST   /auth/login
GET    /user/profile
POST   /budgets
GET    /budgets/current
GET    /budgets/:period
POST   /expenses
GET    /expenses
GET    /analytics/current
GET    /notifications
PATCH  /notifications/:id/read
```

企业版 API：

```text
POST   /organizations
GET    /organizations/:id
POST   /organizations/:id/members
GET    /organizations/:id/members
POST   /approvals
GET    /approvals
POST   /approvals/:id/actions
POST   /budget/adjustments
GET    /budget/adjustments
```

API 约束：

- 所有写接口必须校验用户或组织作用域。
- 消费创建接口需要幂等键，避免重复提交造成重复扣减。
- 预算扣减与变更记录必须在同一事务或等价一致性流程中完成。
- 错误响应不暴露内部堆栈。

## 9. 页面规划

小程序 MVP：

```text
登录/授权
预算首页
创建预算
消费类型设置
添加消费
消费列表
消息中心
我的
```

Phase 2 增加：

```text
分析首页
分类占比
月趋势
预算完成率
消费搜索
数据导出入口
```

管理后台：

```text
登录
组织概览
部门预算
项目预算
成员管理
审批列表
报表分析
系统设置
```

## 10. 阶段计划

### Phase 0：项目初始化与架构设计（2 天）

交付物：

- 完整开发计划书。
- 目标 monorepo 目录。
- TypeScript、ESLint、Prettier、Git Hooks。
- Cloudflare Worker + Hono 基础服务。
- D1 migration 初稿。
- 共享 `packages/types` 与 `packages/utils`。

验收标准：

- 本地能启动 miniapp、admin、server 的基础开发命令。
- `packages/utils` 中金额计算有单元测试。
- D1 schema 可通过 migration 初始化本地数据库。
- README 说明启动方式和环境变量。

### Phase 1：个人预算 MVP（2 周）

Week 1：基础功能

| 时间 | 任务 | 交付 |
| --- | --- | --- |
| Day 1-2 | 用户系统 | 登录、用户资料、会话校验 |
| Day 3-4 | 预算创建 | 月预算创建、当前预算查询 |
| Day 5-7 | 总预算与消费类型 | 总预算调整、消费类型设置 |

Week 2：消费闭环

| 时间 | 任务 | 交付 |
| --- | --- | --- |
| Day 8-10 | 添加消费 | 消费表单、图片占位、消费列表 |
| Day 11-12 | 自动扣减 | 消费记录 + 预算扣减 + 变更审计 |
| Day 13-14 | 超支提醒 | Toast、消息中心、显式超支确认 |

Phase 1 验收标准：

- 用户可以创建月度总预算。
- 用户可以设置一个月度总预算。
- 用户可以添加消费。
- 消费后自动扣减预算。
- 预算剩余金额准确展示。
- 80% 预警、100% 超支提醒生效。
- 预算计算核心逻辑有单元测试。

### Phase 2：数据分析与优化（1 周）

交付物：

- Dashboard 总览卡片。
- ECharts 分类占比。
- ECharts 月趋势。
- 预算完成率。
- 消费搜索：时间、分类、金额。
- 数据导出方案与首版实现。

验收标准：

- 图表能基于真实预算和消费数据生成。
- 搜索条件组合后结果准确。
- 导出字段与页面展示一致。

### Phase 3：企业预算系统（2 周）

Week 5：组织管理

- 公司空间。
- 部门与成员。
- 管理员、财务、负责人、员工角色。
- 权限校验中间件。

Week 6：企业预算

- 部门预算。
- 项目预算。
- 报销申请。
- 主管审核、财务审批、预算扣减。

验收标准：

- 组织数据与个人数据隔离。
- 成员只能访问授权组织数据。
- 审批通过后才扣减预算。
- 企业预算变更可审计。

### Phase 4：AI 增强与商业化（1 周）

交付物：

- AI 预算建议。
- AI 消费分析。
- AI 自动分类。
- 会员或企业版功能边界。

验收标准：

- AI 输出可解释，不直接覆盖用户预算。
- AI 分类需要用户确认或可撤销。
- 商业化能力不影响免费 MVP 主流程。

## 11. 测试计划

单元测试：

- 金额解析：`100`、`100.0`、`100.00`、`12.345`。
- 预算计算：预算 1000，消费 200，剩余 800。
- 预算状态：79.99%、80%、100%、100.01%。
- 零预算：不产生 `NaN` 或 `Infinity`。

API 测试：

- 登录后获取用户资料。
- 创建预算后查询当前预算。
- 添加消费后预算扣减。
- 重复幂等键不重复扣减。
- 无权限访问组织数据返回 403。

边界测试：

- 预算 0。
- 金额负数。
- 超过两位小数。
- 重复提交。
- 并发扣减。
- 已删除分类下添加消费。

手动验收：

- 小程序主流程从登录到添加消费完整跑通。
- 超支确认弹窗与消息中心都能看到记录。
- 管理后台角色权限符合预期。

## 12. 发布计划

第一阶段：个人 MVP

- Cloudflare Worker 部署 API。
- D1 初始化生产数据库。
- R2 配置消费附件桶。
- 小程序体验版验证。

第二阶段：企业版

- 开启组织、审批、成员权限。
- 管理后台上线。
- 数据导出与企业报表稳定化。

## 13. 风险与决策

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 当前 quickstart 与目标 monorepo 差异较大 | 迁移成本上升 | Phase 0 先搭骨架，再迁移功能 |
| D1 对 decimal 不提供强类型保障 | 金额计算错误 | 存两位小数字符串，计算使用精确十进制工具 |
| 小程序登录与 Cloudflare 后端衔接 | 登录链路复杂 | 独立设计 auth service，先完成最小登录 |
| 企业权限模型过早复杂化 | 拖慢 MVP | Phase 1 只做个人数据，企业版后置 |
| AI 功能不稳定 | 影响核心体验 | AI 只做建议，不自动修改预算 |

## 14. 简历项目包装

项目名称：BudgetFlow 智能预算管理平台

项目亮点：

- 设计预算制定、消费扣减、超支提醒的闭环模型。
- 使用精确金额计算方案规避 JavaScript 浮点误差。
- 支持个人预算与企业多租户预算架构。
- 实现企业审批流与预算审计记录。
- 基于 AI 提供预算建议、消费分析和自动分类。

## 15. 下一步执行顺序

1. 确认本计划书。
2. 搭建 monorepo 目标结构。
3. 抽取共享 `types` 与 `utils`。
4. 配置 TypeScript、ESLint、Prettier、Git Hooks。
5. 初始化 Worker + Hono + D1 migration。
6. 将当前预算首页迁移到 UniApp 小程序目录。
