<template>
  <div>
    <div class="page-header">
      <div>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="`/projects/${projectId}`">{{ projectStore.current?.name || 'Project' }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ sprint?.name || 'Sprint' }}</el-breadcrumb-item>
        </el-breadcrumb>
        <h2 class="page-title">{{ sprint?.name || 'Sprint Board' }}</h2>
      </div>

      <div class="header-actions page-actions">
        <el-button @click="router.push(`/projects/${projectId}/sprints/${sprintId}/planning`)">Planning</el-button>
        <el-button type="primary" @click="showTaskForm = true">New Task</el-button>
      </div>
    </div>

    <el-tag :type="sprintStatusType[sprint?.status] as any" style="margin-bottom: 12px;">
      {{ sprintStatusLabel[sprint?.status] || sprint?.status }} | {{ sprint?.start_date || 'n/a' }} - {{ sprint?.end_date || 'n/a' }}
    </el-tag>

    <el-card shadow="never" style="margin-bottom: 14px;">
      <template #header><strong>Burndown</strong></template>
      <Line
        v-if="burndownChartData"
        :data="burndownChartData"
        :options="burndownOptions"
        style="max-height: 280px"
      />
      <el-empty v-else description="No burndown data yet" :image-size="60" />
    </el-card>

    <div class="kanban">
      <div
        v-for="column in columns"
        :key="column.status"
        class="kanban-col"
        @dragover.prevent
        @drop="onDrop(column.status)"
      >
        <div class="col-header">
          <span>{{ column.label }}</span>
          <el-badge :value="tasksByStatus(column.status).length" />
        </div>

        <div class="col-body">
          <div
            v-for="task in tasksByStatus(column.status)"
            :key="task.id"
            class="kanban-card"
            draggable="true"
            @dragstart="onDragStart(task)"
            @click="openTask(task)"
          >
            <div class="card-top">
              <el-tag size="small" :type="priorityType[task.priority] as any">{{ priorityLabel[task.priority] }}</el-tag>
            </div>
            <div class="card-title">{{ task.title }}</div>
            <div class="card-footer">
              <span>{{ task.assignee_name || 'Unassigned' }}</span>
              <span>{{ task.estimate_h ? `${task.estimate_h}h` : '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showTaskForm" title="New task" width="520px">
      <el-form :model="taskForm" label-position="top">
        <el-form-item label="Title" required>
          <el-input v-model="taskForm.title" />
        </el-form-item>

        <el-form-item label="Description">
          <el-input v-model="taskForm.description" type="textarea" :rows="3" />
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Priority">
              <el-select v-model="taskForm.priority" style="width: 100%;">
                <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="Status">
              <el-select v-model="taskForm.status" style="width: 100%;">
                <el-option v-for="(label, value) in taskStatusLabel" :key="value" :label="label" :value="value" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="Estimate (h)">
              <el-input-number v-model="taskForm.estimate_h" :min="0.5" :step="0.5" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Assignee">
          <el-select v-model="taskForm.assignee_id" clearable style="width: 100%;">
            <el-option v-for="member in members" :key="member.id" :label="member.full_name" :value="member.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showTaskForm = false">Cancel</el-button>
        <el-button type="primary" @click="createTask">Create</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="showTaskDetail" :title="selectedTask?.title" size="520px">
      <div v-if="selectedTask">
        <el-form label-position="left" label-width="110px" size="small">
          <el-form-item label="Status">
            <el-select v-model="selectedTask.status" style="width: 100%;" @change="saveSelectedStatus">
              <el-option v-for="(label, value) in taskStatusLabel" :key="value" :label="label" :value="value" />
            </el-select>
          </el-form-item>

          <el-form-item label="Priority">
            <el-tag :type="priorityType[selectedTask.priority] as any">{{ priorityLabel[selectedTask.priority] }}</el-tag>
          </el-form-item>

          <el-form-item label="Assignee">{{ selectedTask.assignee_name || 'Unassigned' }}</el-form-item>
          <el-form-item label="Reporter">{{ selectedTask.reporter_name || '—' }}</el-form-item>
          <el-form-item label="Estimate">{{ selectedTask.estimate_h ? `${selectedTask.estimate_h}h` : '—' }}</el-form-item>
        </el-form>

        <el-divider />
        <strong>Description</strong>
        <p style="margin-top: 8px; white-space: pre-wrap;">{{ selectedTask.description || '—' }}</p>

        <el-divider />
        <strong>Comments</strong>
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <span class="comment-author">{{ comment.author_name }}</span>
          <span class="comment-date">{{ comment.created_at?.slice(0, 16).replace('T', ' ') }}</span>
          <p>{{ comment.body }}</p>
        </div>
        <el-empty v-if="!comments.length" description="No comments" :image-size="40" />

        <el-input v-model="commentText" type="textarea" :rows="2" placeholder="Add comment..." style="margin-top: 10px;" />
        <el-button type="primary" style="margin-top: 8px;" @click="addComment">Send</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { Line } from 'vue-chartjs'
import * as projectsApi from '../../api/projects'
import * as sprintsApi from '../../api/sprints'
import * as tasksApi from '../../api/tasks'
import { useProjectStore } from '../../stores/project.store'
import { priorityLabel, priorityType, sprintStatusLabel, sprintStatusType, taskStatusLabel } from '../../utils/labels'
import type { Task } from '../../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const projectId = computed(() => Number(route.params.id))
const sprintId = computed(() => Number(route.params.sid))

const sprint = ref<any>(null)
const tasks = ref<Task[]>([])
const members = ref<any[]>([])
const burndown = ref<Array<{ date: string; ideal: number; actual: number }>>([])

const showTaskForm = ref(false)
const showTaskDetail = ref(false)
const selectedTask = ref<Task | null>(null)
const comments = ref<any[]>([])
const commentText = ref('')
const draggingTask = ref<Task | null>(null)

const taskForm = reactive({
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  estimate_h: 4,
  assignee_id: null as number | null
})

const columns = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' }
]

const burndownChartData = computed(() => {
  if (!burndown.value.length) return null
  return {
    labels: burndown.value.map((item) => item.date),
    datasets: [
      {
        label: 'Ideal',
        data: burndown.value.map((item) => item.ideal),
        borderColor: '#67c23a',
        backgroundColor: 'rgba(103, 194, 58, 0.12)',
        tension: 0.2
      },
      {
        label: 'Actual',
        data: burndown.value.map((item) => item.actual),
        borderColor: '#409eff',
        backgroundColor: 'rgba(64, 158, 255, 0.12)',
        tension: 0.2
      }
    ]
  }
})

const burndownOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const }
  },
  scales: {
    y: { beginAtZero: true }
  }
}

function tasksByStatus(status: string) {
  return tasks.value.filter((task) => task.status === status)
}

async function loadBoard() {
  const [sprintResp, tasksResp, membersResp] = await Promise.all([
    sprintsApi.getSprint(projectId.value, sprintId.value),
    tasksApi.getTasks(projectId.value, { sprint_id: sprintId.value }),
    projectsApi.getProjectMembers(projectId.value)
  ])

  sprint.value = sprintResp.data
  tasks.value = tasksResp.data
  members.value = membersResp.data
}

async function loadBurndown() {
  const { data } = await sprintsApi.getBurndown(projectId.value, sprintId.value)
  burndown.value = data
}

function onDragStart(task: Task) {
  draggingTask.value = task
}

async function onDrop(status: string) {
  if (!draggingTask.value || draggingTask.value.status === status) return

  const moved = draggingTask.value
  draggingTask.value = null

  const { data } = await tasksApi.updateTask(projectId.value, moved.id, { status })
  const index = tasks.value.findIndex((task) => task.id === moved.id)
  if (index >= 0) tasks.value[index] = data

  await loadBurndown()
}

async function createTask() {
  if (!taskForm.title.trim()) return
  const { data } = await tasksApi.createTask(projectId.value, {
    ...taskForm,
    sprint_id: sprintId.value
  })
  tasks.value.unshift(data)
  showTaskForm.value = false
  Object.assign(taskForm, {
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    estimate_h: 4,
    assignee_id: null
  })
  await loadBurndown()
}

async function openTask(task: Task) {
  selectedTask.value = { ...task }
  showTaskDetail.value = true
  const { data } = await tasksApi.getTaskComments(projectId.value, task.id)
  comments.value = data
}

async function saveSelectedStatus() {
  if (!selectedTask.value) return
  const { data } = await tasksApi.updateTask(projectId.value, selectedTask.value.id, { status: selectedTask.value.status })
  selectedTask.value = data

  const index = tasks.value.findIndex((task) => task.id === data.id)
  if (index >= 0) tasks.value[index] = data

  await loadBurndown()
}

async function addComment() {
  if (!selectedTask.value || !commentText.value.trim()) return
  const { data } = await tasksApi.addTaskComment(projectId.value, selectedTask.value.id, commentText.value)
  comments.value.push(data)
  commentText.value = ''
}

onMounted(async () => {
  await projectStore.fetchOne(projectId.value)
  await Promise.all([loadBoard(), loadBurndown()])
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.kanban {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-col {
  flex: 0 0 240px;
  background: #f3f5f7;
  border-radius: 8px;
  min-height: 460px;
}

.col-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
}

.col-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.card-top {
  margin-bottom: 6px;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  color: #909399;
  font-size: 12px;
}

.comment {
  border-left: 3px solid #e4e7ed;
  padding: 6px 10px;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  margin-right: 8px;
}

.comment-date {
  font-size: 12px;
  color: #909399;
}
</style>
