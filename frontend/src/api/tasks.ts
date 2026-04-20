import { api } from './client'
const base = (pid: number) => `/projects/${pid}/tasks`
export const getTasks = (pid: number, params?: any) => api.get(base(pid), { params })
export const getDeletedTasks = (pid: number) => api.get(`${base(pid)}/trash`)
export const getTask = (pid: number, id: number) => api.get(`${base(pid)}/${id}`)
export const createTask = (pid: number, data: any) => api.post(base(pid), data)
export const updateTask = (pid: number, id: number, data: any) => api.patch(`${base(pid)}/${id}`, data)
export const deleteTask = (pid: number, id: number) => api.delete(`${base(pid)}/${id}`)
export const restoreTask = (pid: number, id: number) => api.post(`${base(pid)}/${id}/restore`)
export const purgeTask = (pid: number, id: number) => api.delete(`${base(pid)}/${id}/purge`)
export const getTaskComments = (pid: number, id: number) => api.get(`${base(pid)}/${id}/comments`)
export const addTaskComment = (pid: number, id: number, body: string) => api.post(`${base(pid)}/${id}/comments`, { body })
