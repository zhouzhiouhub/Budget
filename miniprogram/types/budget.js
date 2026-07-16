/**
 * @typedef {"personal" | "organization"} BudgetScope
 * @typedef {"income" | "expense" | "transfer" | "refund" | "adjustment"} TransactionType
 * @typedef {"normal" | "warning" | "over_budget" | "zero_budget"} BudgetUsageStatus
 *
 * @typedef {Object} BudgetPeriod
 * @property {string} id
 * @property {BudgetScope} scope
 * @property {string} period
 * @property {string} total_amount_yuan
 * @property {string} used_amount_yuan
 *
 * @typedef {Object} ExpenseType
 * @property {string} id
 * @property {string} name
 *
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {TransactionType} type
 * @property {string} title
 * @property {string} expense_type_id
 * @property {string} expense_type_name
 * @property {string} amount_yuan
 * @property {string} remark
 * @property {string} occurred_at
 */

module.exports = {};