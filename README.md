# 预算管理小程序

这是一个基于微信小程序云开发结构初始化的预算管理项目。当前保留原生小程序与云函数目录，先建立预算首页、金额工具和预算服务边界，后续可继续接入云数据库和云函数。

## 开发计划

- [BudgetFlow 智能预算管理平台开发计划书](docs/DEVELOPMENT_PLAN.md)

## 当前结构

- `miniprogram/pages/index/`：预算首页仪表盘。
- `miniprogram/services/`：预算应用服务与页面数据编排。
- `miniprogram/utils/`：金额校验、规范化和精确计算工具。
- `miniprogram/types/`：预算领域 JSDoc 类型。
- `cloudfunctions/quickstartFunctions/`：微信云开发 quickstart 云函数，暂未迁移。

## 金额规则

- 金额单位统一为元。
- 金额字段使用 `_yuan` 后缀。
- 金额进入业务逻辑前会规范化为两位小数字符串，例如 `100.00`。
- 当前实现使用整数“分”作为内部计算表示，避免直接使用 JavaScript 浮点数计算金额。

## 后续建议

1. 按开发计划搭建 monorepo 目标结构。
2. 将预算创建、支出记录和预算扣减接入 Cloudflare Worker + Hono。
3. 为预算扣减和超预算确认补充可审计的 `BudgetMutation` 记录。
