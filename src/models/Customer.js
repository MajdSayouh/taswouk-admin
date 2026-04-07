// Model layer: describes the shape of a Customer entity for the ecommerce domain.

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} city
 * @property {string} country
 * @property {string} createdAt
 */

export function createCustomer(data) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    city: data.city ?? '',
    country: data.country ?? '',
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

