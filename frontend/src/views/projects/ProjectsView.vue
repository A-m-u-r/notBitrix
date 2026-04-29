<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Проекты</h2>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="showCreate = true" v-if="auth.canPermission('projects.manage')">
          Новый проект
        </el-button>
        <el-button v-if="auth.canPermission('projects.delete_restore') && canDeleteProjects" @click="openTrash">Корзина</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="8" v-for="project in projects" :key="project.id" style="margin-bottom:16px">
        <el-card shadow="hover" class="project-card" @click="goTo(project.id)">
          <div class="proj-header">
            <el-tag :type="project.status === 'active' ? 'success' : 'info'" size="small">
              {{ project.status === 'active' ? 'Активный' : 'Архив' }}
            </el-tag>
            <el-dropdown trigger="click" @command="(command: string) => handleCmd(command, project)" @click.stop>
              <button class="icon-hit-area" type="button" aria-label="Project menu" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="archive" v-if="auth.canPermission('projects.manage')">Архивировать</el-dropdown-item>
                  <el-dropdown-item command="delete" v-if="auth.canPermission('projects.delete_restore') && canDeleteProjects">Удалить</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <h3 class="proj-name">{{ project.name }}</h3>
          <p class="proj-desc">{{ project.description || 'Без описания' }}</p>
          <div class="proj-footer">
            <span class="proj-owner">{{ project.owner_name }}</span>
            <span class="proj-date">{{ project.created_at?.slice(0,10) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="24" v-if="!projects.length">
        <el-empty description="Нет проектов" />
      </el-col>
    </el-row>

    <el-dialog v-model="showCreate" title="Новый проект" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Название" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">Отмена</el-button>
        <el-button type="primary" :loading="saving" @click="createProject">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTrash" title="Корзина проектов" width="760px">
      <el-empty v-if="!deletedProjects.length" description="Корзина пуста" />
      <el-table v-else :data="deletedProjects" stripe>
        <el-table-column prop="name" label="Проект" min-width="220" />
        <el-table-column prop="owner_name" label="Владелец" width="160" />
        <el-table-column label="Удален" width="170">
          <template #default="{ row }">{{ row.deleted_at?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column label="Действия" width="230">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="success" text @click="restore(row.id)">Восстановить</el-button>
              <el-button type="danger" text @click="purge(row.id)">Удалить навсегда</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MoreFilled, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as projectsApi from '../../api/projects'
import { useAuthStore } from '../../stores/auth.store'
import type { Project } from '../../types'

const auth = useAuthStore()
const canDeleteProjects = computed(() => auth.can('Admin', 'Director'))
const router = useRouter()
const projects = ref<Project[]>([])
const deletedProjects = ref<any[]>([])
const showCreate = ref(false)
const showTrash = ref(false)
const saving = ref(false)
const form = reactive({ name: '', description: '' })

onMounted(async () => {
  await loadProjects()
})

async function loadProjects() {
  const { data } = await projectsApi.getProjects()
  projects.value = data
}

function goTo(id: number) {
  router.push(`/projects/${id}`)
}

async function createProject() {
  if (!form.name.trim()) return
  saving.value = true
  try {
    const { data } = await projectsApi.createProject(form)
    projects.value.unshift(data)
    showCreate.value = false
    form.name = ''
    form.description = ''
    ElMessage.success('Проект создан')
  } finally {
    saving.value = false
  }
}

async function handleCmd(cmd: string, project: Project) {
  if (cmd === 'archive') {
    await projectsApi.updateProject(project.id, { status: 'archived' })
    project.status = 'archived'
    ElMessage.success('Проект архивирован')
    return
  }

  if (cmd === 'delete') {
    await ElMessageBox.confirm(`Удалить проект "${project.name}"?`, 'Подтверждение', { type: 'warning' })
    await projectsApi.deleteProject(project.id)
    projects.value = projects.value.filter((item) => item.id !== project.id)
    ElMessage.success('Проект перемещен в корзину')
  }
}

async function openTrash() {
  const { data } = await projectsApi.getDeletedProjects()
  deletedProjects.value = data
  showTrash.value = true
}

async function restore(id: number) {
  await projectsApi.restoreProject(id)
  await openTrash()
  await loadProjects()
  ElMessage.success('Проект восстановлен')
}

async function purge(id: number) {
  await ElMessageBox.confirm('Удалить проект безвозвратно?', 'Подтверждение', { type: 'warning' })
  await projectsApi.purgeProject(id)
  await openTrash()
  ElMessage.success('Проект удален')
}
</script>

<style scoped>
.project-card { cursor: pointer; transition: transform 0.15s; }
.project-card:hover { transform: translateY(-2px); }
.proj-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.proj-name { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 6px; }
.proj-desc { font-size: 13px; color: #909399; margin-bottom: 12px; min-height: 36px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.proj-footer { display: flex; justify-content: space-between; font-size: 12px; color: #c0c4cc; }
</style>
