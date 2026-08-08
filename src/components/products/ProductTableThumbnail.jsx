// Table thumbnail: lazy-load + shared blob cache (avoids N concurrent auth fetches).
import { useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { fetchProductImageBlobUrl } from '../../services/productService.js'
import { useInView } from '../../hooks/useInView.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'

/**
 * @param {{
 *   storagePath: string
 *   productId?: string | number
 *   size?: number
 *   className?: string
 * }} props
 */
export function ProductTableThumbnail({ storagePath, productId, size = 40, className = '' }) {
  const { ref, inView } = useInView({ rootMargin: '160px' })
  const publicUrl = useMemo(
    () => resolvePublicMediaUrl(storagePath, { productId }),
    [storagePath, productId],
  )
  const [src, setSrc] = useState(/** @type {string | null} */ (null))
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    if (!inView || !storagePath) return undefined
    if (publicUrl) return undefined

    const ac = new AbortController()
    setLoading(true)
    setFailed(false)

    fetchProductImageBlobUrl(storagePath, { productId, signal: ac.signal })
      .then((url) => {
        if (!ac.signal.aborted) {
          setSrc(url)
          setUsingFallback(true)
        }
      })
      .catch((err) => {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return
        setFailed(true)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [inView, storagePath, productId, publicUrl])

  const boxClass = `inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 ${className}`
  const displaySrc = usingFallback ? src : publicUrl || src

  return (
    <span ref={ref} className={boxClass} style={{ width: size, height: size }}>
      {!inView || loading ? (
        <Spin size="small" />
      ) : failed || !displaySrc ? (
        <span className="text-xs text-slate-400">—</span>
      ) : (
        <img
          src={displaySrc}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded object-cover"
          onError={async () => {
            if (usingFallback) {
              setFailed(true)
              return
            }
            try {
              const url = await fetchProductImageBlobUrl(storagePath, { productId })
              setSrc(url)
              setUsingFallback(true)
              setFailed(false)
            } catch {
              setFailed(true)
            }
          }}
        />
      )}
    </span>
  )
}
