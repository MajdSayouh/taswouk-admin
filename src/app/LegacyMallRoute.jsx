// Route guard: legacy mall management screens until the backend's mall cut-over.
// After it `/api/malls/*` answers 410, a mall is a store with `store_type = "mall"`, and its categories
// are the mall section of the categories page. Keep the mall list route available; redirect legacy
// create/edit/category routes to the store list after cut-over.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '../components/ui/PageLoader.jsx'
import { useFeatures } from '../hooks/useFeatures.js'

export function LegacyMallRoute() {
  const { features, loading } = useFeatures()
  const location = useLocation()

  // Wait for the answer before deciding whether to show legacy screens or redirect.
  if (loading) return <PageLoader />

  if (
    features.mall_cutover &&
    !location.pathname.replace(/\/+$/, '').endsWith('/malls')
  ) {
    return <Navigate to="/stores?type=mall" replace />
  }

  return <Outlet />
}
