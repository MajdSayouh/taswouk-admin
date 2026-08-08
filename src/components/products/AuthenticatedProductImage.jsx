// Loads media path images with axios + JWT (plain <img src> gets 401).
import { useEffect, useMemo, useState } from 'react'
import { Image, Spin } from 'antd'
import { fetchProductImageBlobUrl } from '../../services/productService.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'

/**
 * @param {{
 *   storagePath: string
 *   productId?: string | number
 *   alt?: string
 *   width?: number
 *   height?: number
 *   className?: string
 *   style?: React.CSSProperties
 *   preview?: boolean | import('antd').ImageProps['preview']
 * }} props
 */
export function AuthenticatedProductImage({
  storagePath,
  productId,
  alt = '',
  width,
  height,
  className,
  style,
  preview = true,
  ...imgProps
}) {
  const publicUrl = useMemo(
    () => resolvePublicMediaUrl(storagePath, { productId }),
    [storagePath, productId],
  )
  const [blobUrl, setBlobUrl] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    const ac = new AbortController()

    async function load() {
      setLoading(true)
      setFailed(false)
      setBlobUrl(null)
      setUsingFallback(false)

      try {
        const url = await fetchProductImageBlobUrl(storagePath, {
          signal: ac.signal,
          productId,
        })
        if (ac.signal.aborted) return
        setBlobUrl(url)
        setUsingFallback(true)
      } catch (err) {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return
        setFailed(true)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }

    if (!storagePath) {
      setLoading(false)
      return () => ac.abort()
    }

    if (publicUrl) {
      setLoading(false)
      return () => {
        ac.abort()
        setBlobUrl(null)
      }
    }

    load()

    return () => {
      ac.abort()
      setBlobUrl(null)
    }
  }, [storagePath, productId, publicUrl])

  if (!storagePath) return null

  const boxStyle =
    width != null || height != null
      ? { width: width ?? undefined, height: height ?? undefined, ...style }
      : style

  if (loading) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200 ${className ?? ''}`}
        style={{ width: width ?? 96, height: height ?? 96, ...style }}
      >
        <Spin size="small" />
      </span>
    )
  }

  if (failed || (!publicUrl && !blobUrl)) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-slate-100 text-[10px] text-slate-500 text-center px-1 rounded-lg border border-dashed border-slate-300 ${className ?? ''}`}
        style={{ width: width ?? 96, height: height ?? 96, ...style }}
      >
        Could not load
      </span>
    )
  }

  const previewProps = preview === false ? false : preview === true ? {} : preview
  const src = usingFallback ? blobUrl : publicUrl || blobUrl

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={boxStyle}
      preview={previewProps}
      {...imgProps}
      onError={async () => {
        if (!usingFallback) {
          const ac = new AbortController()
          setLoading(true)
          try {
            const url = await fetchProductImageBlobUrl(storagePath, {
              signal: ac.signal,
              productId,
            })
            setBlobUrl(url)
            setUsingFallback(true)
            setFailed(false)
          } catch {
            setFailed(true)
          } finally {
            setLoading(false)
          }
          return
        }
        setFailed(true)
      }}
    />
  )
}
