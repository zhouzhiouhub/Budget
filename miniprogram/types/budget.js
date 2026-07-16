/**
 * @typedef {"personal" | "organization"} BudgetScope
 * @typedef {"income" | "expense" | "transfer" | "refund" | "adjustment"} TransactionType
 * @typedef {"normal" | "warning" | "over_budget" | "zero_budget"} BudgetUsageStatus
 *
 * @typedef {Object} BudgetCategory
 * @property {string} id
 * @property {string} name
 * @property {string} amount_yuan
 * @property {string} used_amount_yuan
 *
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {TransactionType} type
 * @property {string} title
 * @property {string} category_id
 * @property {string} category_name
 * @property {string} amount_yuan
 * @property {string} occurred_at
 */

module.exports = {};
