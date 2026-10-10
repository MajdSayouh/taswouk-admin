import { useFeatures } from '../../hooks/useFeatures.js'
import { StoresListPage } from '../stores/StoresListPage.jsx'
import { MallsListPage } from './MallsListPage.jsx'

export function MallAdminListPage() {
  const { features } = useFeatures()

  return features.mall_cutover ? <StoresListPage mallMode /> : <MallsListPage />
}
