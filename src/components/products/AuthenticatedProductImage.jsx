// Loads media path images with axios + JWT (plain <img src> gets 401).
import { useEffect, useState } from 'react'
import { Image, Spin } from 'antd'
import { fetchProductImageBlob } from '../../services/productService.js'

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
  const [blobUrl, setBlobUrl] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ac = new AbortController()

    async function load() {
      setLoading(true)
      setFailed(false)
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })

      try {
        const blob = await fetchProductImageBlob(storagePath, {
          signal: ac.signal,
          productId,
        })
        if (ac.signal.aborted) return
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (err) {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return
        setFailed(true)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }

    if (storagePath) load()

    return () => {
      ac.abort()
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [storagePath, productId])

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

  if (failed || !blobUrl) {
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

  return (
    <Image
      src={blobUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={boxStyle}
      preview={previewProps}
      {...imgProps}
      onError={() => setFailed(true)}
    />
  )
}
