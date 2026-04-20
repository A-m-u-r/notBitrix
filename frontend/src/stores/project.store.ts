import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project } from '../types'
import * as projectsApi from '../api/projects'

export const useProjectStore = defineStore('project', () => {
  const list = ref<Project[]>([])
  const current = ref<Project | null>(null)

  async function fetchList() {
    const { data } = await projectsApi.getProjects()
    list.value = data
  }

  async function fetchOne(id: number) {
    const { data } = await projectsApi.getProject(id)
    current.value = data
    return data
  }

  return { list, current, fetchList, fetchOne }
})
