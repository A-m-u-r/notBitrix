import { api } from './client'
export const getRegisterRoles = () => api.get('/auth/register-roles')
export const register = (data: { email: string; full_name: string; password: string; role_name?: string }) => api.post('/auth/register', data)
export const login = (email: string, password: string) => api.post('/auth/login', { email, password })
export const refreshToken = (refreshToken: string) => api.post('/auth/refresh', { refreshToken })
export const logout = (refreshToken: string) => api.post('/auth/logout', { refreshToken })
export const getMe = () => api.get('/auth/me')
