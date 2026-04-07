/**
 * Products ViewModel — orchestrates `productService` and UI state.
 *
 * Flow: View mounts → `fetchProducts()` calls GET `/api/items` → results stored in React state.
 * Create form → `createProduct()` POST `/api/items` (requires JWT) → list refreshed.
 */
import { useCallback, useEffect, useState } from 'react'
import * as productService from '../services/productService.js'
import { createProduct as toProductModel } from '../models/Product.js'

function mapItemToProduct(item) {
  return toProductModel({
    id: String(item.id ?? ''),
    name: item.name ?? '',
    sku: item.id != null ? `ITM-${item.id}` : '',
    category: item.description?.trim() ? item.description.slice(0, 48) : '—',
    price: item.price,
    stock: item.quantity,
    isActive: item.is_active ?? true,
  })
}

export function useProductsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await productService.getProducts()
      setProducts(Array.isArray(items) ? items.map(mapItemToProduct) : [])
    } catch (err) {
      setError(err?.message ?? 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fetchOnMount) fetchProducts()
  }, [fetchOnMount, fetchProducts])

  const createProduct = useCallback(
    async ({ name, description, price, quantity }) => {
      setCreating(true)
      setError(null)
      try {
        const created = await productService.createProduct({
          name,
          description: description || null,
          price: Number(price),
          quantity: quantity != null ? Number(quantity) : 0,
        })
        const next = mapItemToProduct(created)
        setProducts((prev) => [next, ...prev])
        return next
      } catch (err) {
        setError(err?.message ?? 'Failed to create product')
        throw err
      } finally {
        setCreating(false)
      }
    },
    [],
  )

  return {
    products,
    loading,
    creating,
    error,
    fetchProducts,
    createProduct,
  }
}
