import { useEffect, useRef, useState } from 'react'

/**
 * @param {{ rootMargin?: string, once?: boolean }} [options]
 */
export function useInView(options = {}) {
  const { rootMargin = '120px', once = true } = options
  const ref = useRef(/** @type {HTMLElement | null} */ (null))
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || (once && inView)) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, once, rootMargin])

  return { ref, inView }
}
