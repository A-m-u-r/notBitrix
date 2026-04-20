import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/auth/LoginView.vue'), meta: { public: true } },
    { path: '/register', component: () => import('../views/auth/RegisterView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { permissions: ['analytics.view'] } },
        { path: 'projects', component: () => import('../views/projects/ProjectsView.vue') },
        { path: 'projects/:id', component: () => import('../views/projects/ProjectDetailView.vue') },
        { path: 'projects/:id/sprints/:sid', component: () => import('../views/sprints/SprintBoardView.vue') },
        { path: 'projects/:id/sprints/:sid/planning', component: () => import('../views/sprints/SprintPlanningView.vue') },
        { path: 'projects/:id/requirements', component: () => import('../views/requirements/RequirementsView.vue') },
        { path: 'projects/:id/requirements/:rid', component: () => import('../views/requirements/RequirementDetailView.vue') },
        { path: 'projects/:id/tasks', component: () => import('../views/tasks/TasksView.vue') },
        { path: 'projects/:id/bugs', component: () => import('../views/bugs/BugsView.vue') },
        { path: 'projects/:id/documents', component: () => import('../views/documents/DocumentsView.vue') },
        { path: 'projects/:id/documents/:did', component: () => import('../views/documents/DocumentEditorView.vue') },
        { path: 'team', component: () => import('../views/team/TeamView.vue'), meta: { permissions: ['users.view', 'roles.view'] } },
        { path: 'admin', component: () => import('../views/admin/AdminView.vue'), meta: { permissions: ['roles.view', 'users.view'] } },
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return '/login'
  if (!auth.user) {
    try { await auth.fetchMe() } catch { return '/login' }
  }

  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles?.length && !auth.can(...requiredRoles)) {
    return '/projects'
  }

  const requiredPermissions = to.meta.permissions as string[] | undefined
  if (requiredPermissions?.length && !auth.canPermission(...requiredPermissions)) {
    return '/projects'
  }

  return true
})

export default router
