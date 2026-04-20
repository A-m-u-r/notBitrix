import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../api/auth'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))

  const isAuthenticated = computed(() => !!accessToken.value)
  const role = computed(() => user.value?.role_name)

  async function fetchMe() {
    const { data } = await authApi.getMe()
    user.value = data
  }

  async function signIn(email: string, password: string) {
    const { data } = await authApi.login(email, password)
    accessToken.value = data.accessToken
    user.value = data.user
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    await fetchMe()
  }

  async function signUp(payload: { email: string; full_name: string; password: string; role_name?: string }) {
    const { data } = await authApi.register(payload)
    accessToken.value = data.accessToken
    user.value = data.user
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    await fetchMe()
  }

  async function signOut() {
    const rt = localStorage.getItem('refresh_token')
    if (rt) await authApi.logout(rt).catch(() => {})
    user.value = null
    accessToken.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  function can(...roles: string[]): boolean {
    return !!user.value && roles.includes(user.value.role_name)
  }

  function canPermission(...permissions: string[]): boolean {
    if (!user.value) return false
    if (user.value.role_name === 'Admin') return true
    const currentPermissions = user.value.permissions || []
    return permissions.some((permission) => currentPermissions.includes(permission))
  }

  return { user, accessToken, isAuthenticated, role, fetchMe, signIn, signUp, signOut, can, canPermission }
})
