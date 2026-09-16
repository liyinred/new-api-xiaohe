import { AppRouteRecord } from '@/types/router'

export const apiKeysRoutes: AppRouteRecord = {
  name: 'ApiKeyList',
  path: '/api-keys/list',
  component: '/api-keys/index',
  meta: {
    title: 'menus.apiKeys.title',
    icon: 'ri:key-2-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: true
  }
}
