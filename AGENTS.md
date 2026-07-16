# 预算管理小程序 Agent 规则

## 每次任务必须执行

在本仓库执行任何任务时，必须先完成以下动作：

1. 先阅读并遵守本文件。
2. 加载并遵守项目级 skill：`.codex/skills/budget-management-miniapp/SKILL.md`。
3. 修改前先检查相关现有文件，不要直接新建重复模块或改动行为。
4. 变更范围必须贴合用户请求，不要顺手重写无关的 quickstart 代码。
5. 如果用户要求的架构与当前代码结构冲突，先说明假设，再进行大范围迁移。

## 项目现状

本仓库正在规范为预算管理小程序。目前仍是微信小程序云开发 quickstart 结构：

- `miniprogram/`：小程序页面、组件、样式和静态资源。
- `cloudfunctions/`：微信云函数。
- `project.config.json`：微信开发者工具配置。

Vue 3、TypeScript、UniApp、Cloudflare Worker、Hono、D1 目前作为目标技术栈或未来迁移选项处理。只有用户明确要求迁移或新增对应技术栈模块时，才按这些技术栈实现。

## 产品目标

构建一个预算管理系统，支持：

- 个人预算和组织预算管理。
- 预算分类与预算周期。
- 收入、支出、转账、退款、调整等资金流水。
- 产生支出后自动扣减预算。
- 超预算提醒和显式超预算处理。
- 预算分析、分类排行和趋势视图。

核心流程：

```text
创建预算 -> 记录流水 -> 扣减预算 -> 分析优化
```

## 开发原则

- 页面文件不要承载大量业务逻辑。页面只负责 UI 状态协调，把计算、持久化、校验交给 service 或 utility。
- 优先复用已有模块，避免重复实现。创建组件、服务或工具函数前，先搜索是否已有类似实现。
- 数据访问必须收敛到 service/repository 边界，不要在多个页面里散落数据库调用。
- 核心预算计算必须可独立测试。
- 除非用户明确要求，否则不要改变已有用户可见行为。

随着项目增长，推荐组织方式：

```text
miniprogram/
  components/   公共 UI 组件
  features/     预算领域业务组件
  pages/        路由级页面
  services/     应用服务与云端 API 编排
  stores/       共享状态，按需引入
  utils/        纯工具函数
  types/        共享类型定义或 JSDoc typedef
cloudfunctions/
  <function>/
    index.js
    service/
    repository/
    model/
```

## 预算领域规则

- 金额单位统一使用“元”，用户输入、界面展示、字段命名、持久化和业务语义都按元表达。示例：`100.00` 元、`12.50` 元。
- 金额最多保留两位小数；不允许超过两位小数的金额进入业务逻辑。
- 字段命名优先使用 `_yuan` 后缀，例如 `amount_yuan`、`used_amount_yuan`、`total_amount_yuan`。
- 持久化时优先保存为两位小数字符串，例如 `"100.00"`；如果数据库支持精确 decimal 类型，可使用 `DECIMAL(12,2)` 等精确类型。
- 不要用 JavaScript 浮点数直接做金额计算。金额解析、加减乘除和格式化必须使用 decimal 库或等价精确十进制方案。
- 每一次预算变更都必须能通过支出、调整或流水记录审计。
- 不允许静默超支。超预算流程必须提示用户、记录超支金额，并提供追加预算或显式确认路径。

预算扣减流程：

```text
Transaction
-> 查找 BudgetCategory
-> 校验剩余额度
-> 扣减已用金额
-> 生成变更记录
-> 更新统计
```

预警阈值：

- 正常：使用率 `< 80%`。
- 预警：使用率 `>= 80%` 且 `<= 100%`。
- 超预算：使用率 `> 100%`。

## 前端规则

- 当前原生微信小程序代码中，WXML 负责结构，WXSS 负责样式，页面 JS 负责视图编排。
- 面向用户的数据流必须包含 loading、空状态、错误状态和成功状态。
- 页面文件要保持可读性；非平凡的格式化、校验和预算计算逻辑应移动到 `utils/` 或 `services/`。
- 添加新资源或新组件前，优先复用现有资源和组件模式。
- 如果项目迁移到 UniApp/Vue，使用 Vue 3、TypeScript、Composition API 和 uView Plus，不引入 Options API。

## 后端与数据规则

- 当前微信云函数中，一旦逻辑变复杂，就拆分请求处理、业务规则和数据库访问。
- 如果用户要求 Cloudflare Worker/Hono/D1，采用 Controller -> Service -> Repository -> Model 分层。
- 平台允许时，数据库集合、表名和字段使用小写下划线命名。
- 持久化领域记录必须包含 `created_at` 和 `updated_at`。
- 必须保证用户或组织数据隔离。组织级数据必须携带 `organization_id`。
- D1 schema 修改必须走 migration，不要直接修改生产数据。

## 完成标准

每个新功能按实际需要包含：

- 领域模型或类型定义。
- 校验与错误处理。
- Loading、空状态、失败状态。
- 已有测试基础设施时，补充预算计算或数据变更测试。
- 暂无自动化测试时，提供手动验证说明。
- 只有当文档能说明行为或配置变化时才更新文档。

## Git 与安全

- 提交信息保持简洁，例如 `feat: add monthly budget creation`、`fix: correct budget deduction`、`refactor: split expense service`、`docs: update budget rules`。
- 除非用户明确要求，不要删除已有功能、生成资源或配置。
- 不要修改 `project.private.config.json`，除非任务明确与本地微信开发者工具配置有关。


