import { api } from './client'
const base = (pid: number) => `/projects/${pid}/documents`
export const getDocuments = (pid: number) => api.get(base(pid))
export const getDeletedDocuments = (pid: number) => api.get(`${base(pid)}/trash`)
export const getDocument = (pid: number, id: number) => api.get(`${base(pid)}/${id}`)
export const createDocument = (pid: number, data: any) => api.post(base(pid), data)
export const updateDocument = (pid: number, id: number, data: any) => api.patch(`${base(pid)}/${id}`, data)
export const deleteDocument = (pid: number, id: number) => api.delete(`${base(pid)}/${id}`)
export const restoreDocument = (pid: number, id: number) => api.post(`${base(pid)}/${id}/restore`)
export const purgeDocument = (pid: number, id: number) => api.delete(`${base(pid)}/${id}/purge`)
export const getDocHistory = (pid: number, id: number) => api.get(`${base(pid)}/${id}/history`)
