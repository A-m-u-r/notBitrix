import { api } from './client'
const base = (pid: number) => `/projects/${pid}/sprints`
export const getSprints = (pid: number) => api.get(base(pid))
export const getSprint = (pid: number, id: number) => api.get(`${base(pid)}/${id}`)
export const createSprint = (pid: number, data: any) => api.post(base(pid), data)
export const updateSprint = (pid: number, id: number, data: any) => api.patch(`${base(pid)}/${id}`, data)
export const startSprint = (pid: number, id: number) => api.post(`${base(pid)}/${id}/start`, {})
export const completeSprint = (pid: number, id: number) => api.post(`${base(pid)}/${id}/complete`, {})
export const getBurndown = (pid: number, id: number) => api.get(`${base(pid)}/${id}/burndown`)
