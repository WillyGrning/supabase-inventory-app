/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {boolean} verified
 * @property {string} created_at
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} category_id
 * @property {number} stock
 */

/**
 * @typedef {Object} Session
 * @property {string} token
 * @property {string} user_id
 * @property {string} expires_at
 */