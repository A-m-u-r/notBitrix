<template>
  <div v-if="project">
    <div class="page-header">
      <div>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/projects' }">Проекты</el-breadcrumb-item>
          <el-breadcrumb-item>{{ project.name }}</el-breadcrumb-item>
        </el-breadcrumb>
        <h2 class="page-title">{{ project.name }}</h2>
      </div>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="Обзор" name="overview">
        <el-row :gutter="16">
          <el-col :span="8" v-for="s in statusStats" :key="s.label">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-row">
                <span class="stat-label">{{ s.label }}</span>
                <el-tag :type="s.type as any">{{ s.value }}</el-tag>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-card style="margin-top:16px">
          <template #header>Описание</template>
          <p style="color:#606266">{{ project.description || 'Нет описания' }}</p>
        </el-card>
        <el-card style="margin-top:16px">
          <template #header><b>Быстрый доступ</b></template>
          <el-space wrap>
            <el-button @click="go('requirements')"><el-icon><List /></el-icon> Требования</el-button>
            <el-button @click="go('tasks')"><el-icon><Tickets /></el-icon> Задачи</el-button>
            <el-button @click="go('bugs')"><el-icon><Warning /></el-icon> Баги</el-button>
            <el-button @click="go('documents')"><el-icon><Folder /></el-icon> Документы</el-button>
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Спринты" name="sprints">
        <div class="tab-actions page-actions">
          <el-button type="primary" :icon="Plus" @click="showSprintForm = true"
            v-if="auth.canPermission('sprints.manage')">
            Новый спринт
          </el-button>
        </div>
        <el-table :data="sprints" style="width:100%">
          <el-table-column prop="name" label="Название" />
          <el-table-column label="Статус" width="130">
            <template #default="{ row }">
              <el-tag :type="sprintStatusType[row.status] as any">{{ sprintStatusLabel[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="Начало" width="120" />
          <el-table-column prop="end_date" label="Конец" width="120" />
          <el-table-column label="Задачи" width="100">
            <template #default="{ row }">{{ row.done_count }}/{{ row.task_count }}</template>
          </el-table-column>
          <el-table-column label="Действия" width="340">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button @click="$router.push(`/projects/${pid}/sprints/${row.id}`)">Борд</el-button>
                <el-button @click="$router.push(`/projects/${pid}/sprints/${row.id}/planning`)">Planning</el-button>
                <el-button type="success" v-if="row.status === 'planned'"
                  @click="doStart(row)">Старт</el-button>
                <el-button type="warning" v-if="row.status === 'active'"
                  @click="doComplete(row)">Завершить</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="Участники" name="members">
        <div class="tab-actions page-actions">
          <el-button type="primary" :icon="Plus" @click="showMemberForm = true"
            v-if="auth.canPermission('projects.manage')">
            Добавить участника
          </el-button>
        </div>
        <el-table :data="members">
          <el-table-column prop="full_name" label="Имя" />
          <el-table-column prop="email" label="Email" />
          <el-table-column prop="role_name" label="Роль в системе" width="140" />
          <el-table-column prop="role_in_project" label="Роль в проекте" width="140" />
          <el-table-column label="Действие" width="140">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="danger" text
                  v-if="auth.canPermission('projects.manage')"
                  @click="removeMember(row.id)">Удалить</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- Sprint dialog -->
    <el-dialog v-model="showSprintForm" title="Новый спринт" width="460px">
      <el-form :model="sprintForm" label-position="top">
        <el-form-item label="Название"><el-input v-model="sprintForm.name" /></el-form-item>
        <el-form-item label="Цель"><el-input v-model="sprintForm.goal" type="textarea" :rows="2" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Начало"><el-date-picker v-model="sprintForm.start_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Конец"><el-date-picker v-model="sprintForm.end_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showSprintForm = false">Отмена</el-button>
        <el-button type="primary" @click="createSprint">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Member dialog -->
    <el-dialog v-model="showMemberForm" title="Добавить участника" width="400px">
      <el-form label-position="top">
        <el-form-item label="Пользователь">
          <el-select v-model="memberUserId" filterable style="width:100%">
            <el-option v-for="u in allUsers" :key="u.id" :label="`${u.full_name} (${u.email})`" :value="u.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMemberForm = false">Отмена</el-button>
        <el-button type="primary" @click="addMember">Добавить</el-button>
      </template>
    </el-dialog>
  </div>
  <el-skeleton v-else :rows="6" animated />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as projectsApi from '../../api/projects'
import * as sprintsApi from '../../api/sprints'
import { getUsers } from '../../api/users'
import { useAuthStore } from '../../stores/auth.store'
import { useProjectStore } from '../../stores/project.store'
import { sprintStatusLabel, sprintStatusType } from '../../utils/labels'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectStore = useProjectStore()

const pid = computed(() => Number(route.params.id))
const project = computed(() => projectStore.current)
const tab = ref('overview')
const sprints = ref<any[]>([])
const members = ref<any[]>([])
const allUsers = ref<any[]>([])
const stats = ref<any>(null)
const showSprintForm = ref(false)
const showMemberForm = ref(false)
const memberUserId = ref<number | null>(null)
const sprintForm = reactive({ name: '', goal: '', start_date: '', end_date: '' })

const statusStats = computed(() => {
  if (!stats.value) return []
  const reqs = stats.value.reqByStatus || []
  const total = reqs.reduce((s: number, r: any) => s + r.count, 0)
  const bugs = stats.value.bugsByStatus || []
  const openBugs = bugs.filter((b: any) => ['open', 'in_progress'].includes(b.status)).reduce((s: number, b: any) => s + b.count, 0)
  const tasks = stats.value.tasksByStatus || []
  const doneTasks = tasks.find((t: any) => t.status === 'done')?.count || 0
  const totalTasks = tasks.reduce((s: number, t: any) => s + t.count, 0)
  return [
    { label: 'Требований', value: total, type: 'primary' },
    { label: 'Открытых багов', value: openBugs, type: openBugs > 0 ? 'danger' : 'success' },
    { label: `Задач выполнено`, value: `${doneTasks}/${totalTasks}`, type: 'success' },
  ]
})

onMounted(async () => {
  await projectStore.fetchOne(pid.value)
  const [s, m, st, u] = await Promise.all([
    sprintsApi.getSprints(pid.value),
    projectsApi.getProjectMembers(pid.value),
    projectsApi.getProjectStats(pid.value),
    getUsers()
  ])
  sprints.value = s.data
  members.value = m.data
  stats.value = st.data
  allUsers.value = u.data
})

function go(section: string) { router.push(`/projects/${pid.value}/${section}`) }

async function createSprint() {
  const { data } = await sprintsApi.createSprint(pid.value, sprintForm)
  sprints.value.unshift(data)
  showSprintForm.value = false
  Object.assign(sprintForm, { name: '', goal: '', start_date: '', end_date: '' })
}

async function doStart(s: any) {
  try {
    const { data } = await sprintsApi.startSprint(pid.value, s.id)
    Object.assign(s, data)
    ElMessage.success('Спринт запущен')
  } catch (e: any) { ElMessage.error(e.response?.data?.message) }
}

async function doComplete(s: any) {
  const { data } = await sprintsApi.completeSprint(pid.value, s.id)
  Object.assign(s, data)
  ElMessage.success('Спринт завершён')
}

async function addMember() {
  if (!memberUserId.value) return
  await projectsApi.addProjectMember(pid.value, { user_id: memberUserId.value })
  const { data } = await projectsApi.getProjectMembers(pid.value)
  members.value = data
  showMemberForm.value = false
}

async function removeMember(userId: number) {
  await projectsApi.removeProjectMember(pid.value, userId)
  members.value = members.value.filter(m => m.id !== userId)
}
</script>

<style scoped>
.tab-actions { margin-bottom: 12px; }
.stat-card { margin-bottom: 16px; }
.stat-row { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 14px; color: #606266; }
</style>
