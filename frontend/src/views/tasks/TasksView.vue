<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Задачи</h2>
      <div class="page-actions">
        <el-button v-if="auth.canPermission('tasks.manage')" type="primary" :icon="Plus" @click="showForm = true">Новая задача</el-button>
        <el-button v-if="auth.canPermission('tasks.delete_restore')" @click="openTrash">Корзина</el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom:16px">
      <el-row :gutter="12" class="filter-grid">
        <el-col :span="6">
          <el-input v-model="filters.search" placeholder="Поиск..." clearable @input="load" :prefix-icon="Search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" clearable placeholder="Статус" @change="load" style="width:100%">
            <el-option v-for="(label, value) in taskStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.priority" clearable placeholder="Приоритет" @change="load" style="width:100%">
            <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.sprint_id" clearable placeholder="Спринт" @change="load" style="width:100%">
            <el-option v-for="sprint in sprints" :key="sprint.id" :label="sprint.name" :value="sprint.id" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-table :data="tasks" stripe @row-click="openTask">
      <el-table-column prop="title" label="Название" min-width="220" />
      <el-table-column label="Приоритет" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="priorityType[row.priority] as any">{{ priorityLabel[row.priority] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Статус" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="taskStatusType[row.status] as any">{{ taskStatusLabel[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="assignee_name" label="Исполнитель" width="150" />
      <el-table-column prop="sprint_name" label="Спринт" width="150" />
      <el-table-column label="Оценка" width="90">
        <template #default="{ row }">{{ row.estimate_h ? `${row.estimate_h}ч` : '—' }}</template>
      </el-table-column>
      <el-table-column label="Действия" width="120">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="danger" text
              v-if="auth.canPermission('tasks.delete_restore')"
              @click.stop="deleteTask(row)"
            >
              Удалить
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" title="Новая задача" width="540px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Название" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="Описание"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Приоритет">
              <el-select v-model="form.priority" style="width:100%">
                <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Оценка (ч)">
              <el-input-number v-model="form.estimate_h" :min="0.5" :step="0.5" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Спринт">
              <el-select v-model="form.sprint_id" clearable style="width:100%">
                <el-option v-for="sprint in sprints" :key="sprint.id" :label="sprint.name" :value="sprint.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Исполнитель">
          <el-select v-model="form.assignee_id" clearable style="width:100%">
            <el-option v-for="member in members" :key="member.id" :label="member.full_name" :value="member.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">Отмена</el-button>
        <el-button type="primary" @click="createTask">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTrash" title="Корзина задач" width="840px">
      <el-empty v-if="!deletedTasks.length" description="Корзина пуста" />
      <el-table v-else :data="deletedTasks" stripe>
        <el-table-column prop="title" label="Задача" min-width="240" />
        <el-table-column prop="assignee_name" label="Исполнитель" width="160" />
        <el-table-column label="Удалено" width="170">
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

    <el-drawer v-model="showDetail" :title="selected?.title" size="500px">
      <div v-if="selected">
        <el-form label-position="left" label-width="120px" size="small">
          <el-form-item label="Статус">
            <el-select v-model="selected.status" @change="saveStatus" style="width:100%">
              <el-option v-for="(label, value) in taskStatusLabel" :key="value" :label="label" :value="value" />
            </el-select>
          </el-form-item>
          <el-form-item label="Приоритет">
            <el-tag :type="priorityType[selected.priority] as any" size="small">{{ priorityLabel[selected.priority] }}</el-tag>
          </el-form-item>
          <el-form-item label="Исполнитель"><span>{{ selected.assignee_name || '—' }}</span></el-form-item>
          <el-form-item label="Оценка"><span>{{ selected.estimate_h ? `${selected.estimate_h} ч` : '—' }}</span></el-form-item>
          <el-form-item label="Спринт"><span>{{ selected.sprint_name || '—' }}</span></el-form-item>
          <el-form-item label="Создано"><span>{{ selected.created_at?.slice(0,10) }}</span></el-form-item>
        </el-form>
        <el-divider />
        <b>Описание</b>
        <p style="color:#606266;margin-top:8px;white-space:pre-wrap">{{ selected.description || '—' }}</p>
        <el-divider />
        <b>Комментарии</b>
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <span class="comment-author">{{ comment.author_name }}</span>
          <span class="comment-date">{{ comment.created_at?.slice(0,16).replace('T',' ') }}</span>
          <p>{{ comment.body }}</p>
        </div>
        <el-empty v-if="!comments.length" description="Нет комментариев" :image-size="40" />
        <el-input v-model="commentText" type="textarea" :rows="2" placeholder="Комментарий..." style="margin-top:10px" />
        <el-button type="primary" style="margin-top:8px" @click="addComment">Добавить</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as tasksApi from '../../api/tasks'
import * as sprintsApi from '../../api/sprints'
import * as projectsApi from '../../api/projects'
import { useAuthStore } from '../../stores/auth.store'
import { taskStatusLabel, taskStatusType, priorityLabel, priorityType } from '../../utils/labels'
import type { Task } from '../../types'

const route = useRoute()
const auth = useAuthStore()
const pid = computed(() => Number(route.params.id))

const tasks = ref<Task[]>([])
const deletedTasks = ref<any[]>([])
const sprints = ref<any[]>([])
const members = ref<any[]>([])
const showForm = ref(false)
const showTrash = ref(false)
const showDetail = ref(false)
const selected = ref<Task | null>(null)
const comments = ref<any[]>([])
const commentText = ref('')

const filters = reactive({ search: '', status: '', priority: '', sprint_id: null as number | null })
const form = reactive({ title: '', description: '', priority: 'medium', estimate_h: 4, sprint_id: null as number | null, assignee_id: null as number | null })

async function load() {
  const { data } = await tasksApi.getTasks(pid.value, filters)
  tasks.value = data
}

onMounted(async () => {
  await load()
  const [sprintResp, membersResp] = await Promise.all([
    sprintsApi.getSprints(pid.value),
    projectsApi.getProjectMembers(pid.value)
  ])
  sprints.value = sprintResp.data
  members.value = membersResp.data
})

async function openTask(task: Task) {
  selected.value = { ...task }
  showDetail.value = true
  const { data } = await tasksApi.getTaskComments(pid.value, task.id)
  comments.value = data
}

async function saveStatus() {
  if (!selected.value) return
  const { data } = await tasksApi.updateTask(pid.value, selected.value.id, { status: selected.value.status })
  const idx = tasks.value.findIndex((item) => item.id === data.id)
  if (idx >= 0) tasks.value[idx] = data
}

async function createTask() {
  if (!form.title.trim()) return
  const { data } = await tasksApi.createTask(pid.value, form)
  tasks.value.unshift(data)
  showForm.value = false
  Object.assign(form, { title: '', description: '', priority: 'medium', estimate_h: 4, sprint_id: null, assignee_id: null })
  ElMessage.success('Задача создана')
}

async function deleteTask(row: Task) {
  await ElMessageBox.confirm('Удалить задачу?', 'Подтверждение', { type: 'warning' })
  await tasksApi.deleteTask(pid.value, row.id)
  tasks.value = tasks.value.filter((item) => item.id !== row.id)
  ElMessage.success('Задача перемещена в корзину')
}

async function openTrash() {
  const { data } = await tasksApi.getDeletedTasks(pid.value)
  deletedTasks.value = data
  showTrash.value = true
}

async function restore(id: number) {
  await tasksApi.restoreTask(pid.value, id)
  await openTrash()
  await load()
  ElMessage.success('Задача восстановлена')
}

async function purge(id: number) {
  await ElMessageBox.confirm('Удалить задачу безвозвратно?', 'Подтверждение', { type: 'warning' })
  await tasksApi.purgeTask(pid.value, id)
  await openTrash()
  ElMessage.success('Задача удалена')
}

async function addComment() {
  if (!commentText.value.trim() || !selected.value) return
  const { data } = await tasksApi.addTaskComment(pid.value, selected.value.id, commentText.value)
  comments.value.push(data)
  commentText.value = ''
}
</script>

<style scoped>
.el-table { cursor: pointer; }
.comment { border-left: 3px solid #e8e8e8; padding: 6px 10px; margin-bottom: 8px; }
.comment-author { font-weight: 600; font-size: 13px; margin-right: 8px; }
.comment-date { font-size: 11px; color: #c0c4cc; }
</style>

