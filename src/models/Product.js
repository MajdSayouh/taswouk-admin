// Model layer: describes the shape of a Product entity used across the app.
// ViewModels and Services should use this structure when working with products.

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} sku
 * @property {string} category
 * @property {number} price
 * @property {number} stock
 * @property {boolean} isActive
 */

// Example helper to build a Product model instance from raw data.
export function createProduct(data) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    sku: data.sku ?? '',
    category: data.category ?? '',
    price: Number(data.price ?? 0),
    stock: Number(data.stock ?? 0),
    isActive: Boolean(data.isActive ?? true),
  }
}

