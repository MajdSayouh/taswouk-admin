// Route guard: the legacy mall screens (/malls*, /mall-categories) only until the backend's mall cut-over.
// After it `/api/malls/*` answers 410, a mall is a store with `store_type = "mall"`, and its categories
// are the mall section of the categories page — so these routes send the admin to the stores list,
// filtered to malls. The screens themselves are removed in the post-cut-over cleanup.
import { Navigate, Outlet } from 'react-router-dom'
import { PageLoader } from '../components/ui/PageLoader.jsx'
import { useFeatures } from '../hooks/useFeatures.js'

export function LegacyMallRoute() {
  const { features, loading } = useFeatures()

  // Wait for the answer: rendering the legacy page first would fire its /api/malls requests.
  if (loading) return <PageLoader />

  if (features.mall_cutover) {
    return <Navigate to="/stores?type=mall" replace />
  }

  return <Outlet />
}
