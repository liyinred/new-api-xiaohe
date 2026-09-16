import { AppRouteRecord } from '@/types/router'

export const profileRoutes: AppRouteRecord = {
  name: 'UserCenter',
  path: '/profile',
  component: '/system/user-center',
  meta: {
    title: 'menus.profile.title',
    icon: 'ri:user-3-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: true
  }
}
