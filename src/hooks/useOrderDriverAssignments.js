import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'tasouwk_order_driver_assignments'

function readAssignments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed != null && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAssignments(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Mirrors server-assigned driver id for display; updated after successful POST /api/delivery/assign and for demo/mock rows. */
export function useOrderDriverAssignments() {
  const [assignments, setAssignments] = useState(() => readAssignments())

  useEffect(() => {
    function sync() {
      setAssignments(readAssignments())
    }
    function onStorage(e) {
      if (e.storageArea === localStorage && e.key === STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const assign = useCallback((orderId, driverId) => {
    setAssignments((prev) => {
      const id = String(orderId)
      const next = { ...prev }
      if (driverId == null || driverId === '') {
        delete next[id]
      } else {
        next[id] = String(driverId)
      }
      writeAssignments(next)
      return next
    })
  }, [])

  const getDriverId = useCallback(
    (orderId) => assignments[String(orderId)] ?? null,
    [assignments],
  )

  return { assignments, assign, getDriverId }
}
