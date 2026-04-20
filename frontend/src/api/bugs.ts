import { api } from './client'
const base = (pid: number) => `/projects/${pid}/bugs`
export const getBugs = (pid: number, params?: any) => api.get(base(pid), { params })
export const getDeletedBugs = (pid: number) => api.get(`${base(pid)}/trash`)
export const getBug = (pid: number, id: number) => api.get(`${base(pid)}/${id}`)
export const createBug = (pid: number, data: any) => api.post(base(pid), data)
export const updateBug = (pid: number, id: number, data: any) => api.patch(`${base(pid)}/${id}`, data)
export const deleteBug = (pid: number, id: number) => api.delete(`${base(pid)}/${id}`)
export const restoreBug = (pid: number, id: number) => api.post(`${base(pid)}/${id}/restore`)
export const purgeBug = (pid: number, id: number) => api.delete(`${base(pid)}/${id}/purge`)
export const getBugComments = (pid: number, id: number) => api.get(`${base(pid)}/${id}/comments`)
export const addBugComment = (pid: number, id: number, body: string) => api.post(`${base(pid)}/${id}/comments`, { body })
