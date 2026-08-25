import {
  AppstoreOutlined,
  BellOutlined,
  BankOutlined,
  DashboardOutlined,
  FolderOutlined,
  CarOutlined,
  CoffeeOutlined,
  GlobalOutlined,
  GiftOutlined,
  IdcardOutlined,
  PictureOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { isAdminRole } from '../store/authStore.js'

/**
 * @typedef {Object} NavItemDef
 * @property {string} key — stable id for React keys
 * @property {string} to
 * @property {'exact' | 'prefix'} match
 * @property {string} labelKey — i18n key under common namespace
 * @property {import('react').ComponentType<{ className?: string }>} Icon
 */

/** Routes that exist in the app today (no dead links). */
const MAIN_NAV = /** @type {NavItemDef[]} */ ([
  {
    key: 'dashboard',
    to: '/home',
    match: 'exact',
    labelKey: 'nav.dashboard',
    Icon: DashboardOutlined,
  },
  {
    key: 'orders',
    to: '/orders',
    match: 'exact',
    labelKey: 'nav.orders',
    Icon: ShoppingOutlined,
  },
  {
    key: 'drivers',
    to: '/drivers',
    match: 'exact',
    labelKey: 'nav.drivers',
    Icon: CarOutlined,
  },
  {
    key: 'products',
    to: '/products',
    match: 'prefix',
    labelKey: 'nav.products',
    Icon: AppstoreOutlined,
  },
  {
    key: 'categories',
    to: '/categories',
    match: 'prefix',
    labelKey: 'nav.categories',
    Icon: FolderOutlined,
  },
  {
    key: 'stores',
    to: '/stores',
    match: 'prefix',
    labelKey: 'nav.stores',
    Icon: ShopOutlined,
  },
  {
    key: 'coupons',
    to: '/coupons',
    match: 'prefix',
    labelKey: 'nav.coupons',
    Icon: TagOutlined,
  },
])

const ADMIN_ONLY_NAV = /** @type {NavItemDef[]} */ ([
  {
    key: 'moderation',
    to: '/moderation',
    match: 'prefix',
    labelKey: 'nav.moderation',
    Icon: SafetyCertificateOutlined,
  },
  {
    key: 'restaurants',
    to: '/restaurants',
    match: 'prefix',
    labelKey: 'nav.restaurants',
    Icon: CoffeeOutlined,
  },
  {
    key: 'progressiveCoupons',
    to: '/progressive-coupons',
    match: 'prefix',
    labelKey: 'nav.progressiveCoupons',
    Icon: RiseOutlined,
  },
  {
    key: 'banners',
    to: '/banners',
    match: 'exact',
    labelKey: 'nav.banners',
    Icon: PictureOutlined,
  },
  {
    key: 'points',
    to: '/points',
    match: 'exact',
    labelKey: 'nav.points',
    Icon: GiftOutlined,
  },
  {
    key: 'exchangeRate',
    to: '/exchange-rate',
    match: 'exact',
    labelKey: 'nav.exchangeRate',
    Icon: SwapOutlined,
  },
  {
    key: 'users',
    to: '/users',
    match: 'prefix',
    labelKey: 'nav.users',
    Icon: IdcardOutlined,
    children: [
      {
        key: 'usersCustomers',
        to: '/users/customers',
        match: 'exact',
        labelKey: 'nav.usersCustomers',
      },
      {
        key: 'usersSellers',
        to: '/users/sellers',
        match: 'exact',
        labelKey: 'nav.usersSellers',
      },
      {
        key: 'usersDelivery',
        to: '/users/delivery',
        match: 'exact',
        labelKey: 'nav.usersDelivery',
      },
      {
        key: 'usersAdmins',
        to: '/users/admins',
        match: 'exact',
        labelKey: 'nav.usersAdmins',
      },
    ],
  },
  {
    key: 'notifications',
    to: '/notifications',
    match: 'prefix',
    labelKey: 'nav.notifications',
    Icon: BellOutlined,
  },
  {
    key: 'malls',
    to: '/malls',
    match: 'prefix',
    labelKey: 'nav.malls',
    Icon: BankOutlined,
  },
  {
    key: 'mallCategories',
    to: '/mall-categories',
    match: 'prefix',
    labelKey: 'nav.mallCategories',
    Icon: FolderOutlined,
  },
  {
    key: 'mallCatalog',
    to: '/mall-catalog',
    match: 'prefix',
    labelKey: 'nav.mallCatalog',
    Icon: AppstoreOutlined,
  },
  {
    key: 'externalShops',
    to: '/external-shops',
    match: 'prefix',
    labelKey: 'nav.externalShops',
    Icon: GlobalOutlined,
  },
])

const SELLERS_ITEM = /** @type {NavItemDef} */ ({
  key: 'sellers',
  to: '/sellers',
  match: 'prefix',
  labelKey: 'nav.sellers',
  Icon: UserAddOutlined,
})

const PROFILE_ITEM = /** @type {NavItemDef} */ ({
  key: 'profile',
  to: '/profile',
  match: 'exact',
  labelKey: 'nav.profile',
  Icon: UserOutlined,
})

/**
 * @param {{ role?: string } | null | undefined} user
 * @returns {NavItemDef[]}
 */
export function getDashboardNavItems(user) {
  if (user && isAdminRole(user.role)) {
    return [...MAIN_NAV, ...ADMIN_ONLY_NAV, SELLERS_ITEM, PROFILE_ITEM]
  }
  return [...MAIN_NAV, PROFILE_ITEM]
}

/**
 * @param {string} pathname
 * @param {string} to
 * @param {'exact' | 'prefix'} match
 */
export function isNavActive(pathname, to, match) {
  if (match === 'prefix') {
    return pathname === to || pathname.startsWith(`${to}/`)
  }
  return pathname === to
}
