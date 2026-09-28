/**
 * Phase 4 switches — GET /api/features (public, no auth).
 * @see https://test.taswouk.com/api/docs#/Health
 */
import { apiClient } from './apiClient.js'

/**
 * Every switch off: what the dashboard assumes when it cannot tell otherwise.
 * An older backend has no `/api/features` at all (404), and it is also the
 * state of a backend before the cut-over, so falling back to it never offers
 * something the server would refuse.
 */
export const FEATURES_OFF = Object.freeze({
  mall_cutover: false,
  category_scope_enforced: false,
  governorate_visibility: false,
})

/**
 * GET /api/features
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ mall_cutover: boolean, category_scope_enforced: boolean, governorate_visibility: boolean }>}
 */
export async function getFeatures(options = {}) {
  const { data } = await apiClient.get('/api/features', {
    signal: options.signal,
    // Public: an expired token must not trip the refresh/logout path here.
    skipAuthHeader: true,
    skipAuthLogout: true,
    skipGlobalErrorMessage: true,
  })
  // Only a literal `true` turns a switch on; anything else reads as off.
  return {
    mall_cutover: data?.mall_cutover === true,
    category_scope_enforced: data?.category_scope_enforced === true,
    governorate_visibility: data?.governorate_visibility === true,
  }
}
