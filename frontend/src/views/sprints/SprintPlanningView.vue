<template>
  <div>
    <div class="page-header">
      <div>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="`/projects/${projectId}`">{{ projectStore.current?.name || 'Project' }}</el-breadcrumb-item>
          <el-breadcrumb-item :to="`/projects/${projectId}/sprints/${sprintId}`">{{ sprint?.name || 'Sprint' }}</el-breadcrumb-item>
          <el-breadcrumb-item>Planning</el-breadcrumb-item>
        </el-breadcrumb>
        <h2 class="page-title">Sprint Planning</h2>
      </div>
      <div class="page-actions">
        <el-button @click="router.push(`/projects/${projectId}/sprints/${sprintId}`)">Back to board</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      :closable="false"
      style="margin-bottom: 12px;"
      :title="`Sprint: ${sprint?.name || '-'} | Goal: ${sprint?.goal || 'No goal'}`"
      description="Drag tasks/requirements between Backlog and Sprint columns."
    />

    <el-card shadow="never" style="margin-bottom: 12px;">
      <el-row :gutter="10" class="filter-grid">
        <el-col :span="6">
          <el-input v-model="taskFilters.search" clearable placeholder="Task search" />
        </el-col>
        <el-col :span="5">
          <el-select v-model="taskFilters.assignee_id" clearable placeholder="Task assignee" style="width: 100%;">
            <el-option v-for="member in members" :key="member.id" :label="member.full_name" :value="member.id" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="taskFilters.priority" clearable placeholder="Task priority" style="width: 100%;">
            <el-option label="Critical" value="critical" />
            <el-option label="High" value="high" />
            <el-option label="Medium" value="medium" />
            <el-option label="Low" value="low" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="taskFilters.status" clearable placeholder="Task status" style="width: 100%;">
            <el-option label="Backlog" value="backlog" />
            <el-option label="To Do" value="todo" />
            <el-option label="In Progress" value="in_progress" />
            <el-option label="Review" value="review" />
            <el-option label="Done" value="done" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-input v-model="requirementFilters.search" clearable placeholder="Requirement search" />
        </el-col>
      </el-row>

      <el-row :gutter="10" style="margin-top: 10px;">
        <el-col :span="4">
          <el-select v-model="requirementFilters.priority" clearable placeholder="Req priority" style="width: 100%;">
            <el-option label="Critical" value="critical" />
            <el-option label="High" value="high" />
            <el-option label="Medium" value="medium" />
            <el-option label="Low" value="low" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="requirementFilters.status" clearable placeholder="Req status" style="width: 100%;">
            <el-option label="Draft" value="draft" />
            <el-option label="Review" value="review" />
            <el-option label="Approved" value="approved" />
            <el-option label="Implemented" value="implemented" />
            <el-option label="Verified" value="verified" />
            <el-option label="Rejected" value="rejected" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-button @click="resetFilters">Reset filters</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="12">
      <el-col :span="12">
        <el-card
          shadow="never"
          class="drop-zone"
          :class="{ dragging: dragTaskTarget === 'backlog' }"
          @dragover.prevent
          @dragenter.prevent="dragTaskTarget = 'backlog'"
          @dragleave.prevent="dragTaskTarget = null"
          @drop.prevent="dropTaskTo('backlog')"
        >
          <template #header><strong>Backlog Tasks ({{ filteredBacklogTasks.length }})</strong></template>
          <el-empty v-if="!filteredBacklogTasks.length" description="No tasks" :image-size="40" />
          <div
            v-for="task in filteredBacklogTasks"
            :key="`backlog-task-${task.id}`"
            class="item-row"
            draggable="true"
            @dragstart="startTaskDrag(task.id)"
            @dragend="dragTaskTarget = null"
          >
            <div class="item-main">
              <div class="item-title">{{ task.title }}</div>
              <div class="item-meta">{{ task.priority }} | {{ task.assignee_name || 'unassigned' }} | {{ task.estimate_h ? `${task.estimate_h}h` : 'no estimate' }}</div>
            </div>
            <el-button type="primary" @click="assignTask(task.id)">Assign</el-button>
          </div>
        </el-card>

        <el-card
          shadow="never"
          style="margin-top: 12px;"
          class="drop-zone"
          :class="{ dragging: dragRequirementTarget === 'backlog' }"
          @dragover.prevent
          @dragenter.prevent="dragRequirementTarget = 'backlog'"
          @dragleave.prevent="dragRequirementTarget = null"
          @drop.prevent="dropRequirementTo('backlog')"
        >
          <template #header><strong>Backlog Requirements ({{ filteredBacklogRequirements.length }})</strong></template>
          <el-empty v-if="!filteredBacklogRequirements.length" description="No requirements" :image-size="40" />
          <div
            v-for="requirement in filteredBacklogRequirements"
            :key="`backlog-req-${requirement.id}`"
            class="item-row"
            draggable="true"
            @dragstart="startRequirementDrag(requirement.id)"
            @dragend="dragRequirementTarget = null"
          >
            <div class="item-main">
              <div class="item-title">{{ requirement.code }} - {{ requirement.title }}</div>
              <div class="item-meta">{{ requirement.priority }} | {{ requirement.status }}</div>
            </div>
            <el-button type="primary" @click="assignRequirement(requirement.id)">Assign</el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card
          shadow="never"
          class="drop-zone"
          :class="{ dragging: dragTaskTarget === 'sprint' }"
          @dragover.prevent
          @dragenter.prevent="dragTaskTarget = 'sprint'"
          @dragleave.prevent="dragTaskTarget = null"
          @drop.prevent="dropTaskTo('sprint')"
        >
          <template #header><strong>Sprint Tasks ({{ filteredSprintTasks.length }})</strong></template>
          <el-empty v-if="!filteredSprintTasks.length" description="No tasks in sprint" :image-size="40" />
          <div
            v-for="task in filteredSprintTasks"
            :key="`sprint-task-${task.id}`"
            class="item-row"
            draggable="true"
            @dragstart="startTaskDrag(task.id)"
            @dragend="dragTaskTarget = null"
          >
            <div class="item-main">
              <div class="item-title">{{ task.title }}</div>
              <div class="item-meta">{{ task.status }} | {{ task.assignee_name || 'unassigned' }}</div>
            </div>
            <el-button type="danger" plain @click="unassignTask(task.id)">Remove</el-button>
          </div>
        </el-card>

        <el-card
          shadow="never"
          style="margin-top: 12px;"
          class="drop-zone"
          :class="{ dragging: dragRequirementTarget === 'sprint' }"
          @dragover.prevent
          @dragenter.prevent="dragRequirementTarget = 'sprint'"
          @dragleave.prevent="dragRequirementTarget = null"
          @drop.prevent="dropRequirementTo('sprint')"
        >
          <template #header><strong>Sprint Requirements ({{ filteredSprintRequirements.length }})</strong></template>
          <el-empty v-if="!filteredSprintRequirements.length" description="No requirements in sprint" :image-size="40" />
          <div
            v-for="requirement in filteredSprintRequirements"
            :key="`sprint-req-${requirement.id}`"
            class="item-row"
            draggable="true"
            @dragstart="startRequirementDrag(requirement.id)"
            @dragend="dragRequirementTarget = null"
          >
            <div class="item-main">
              <div class="item-title">{{ requirement.code }} - {{ requirement.title }}</div>
              <div class="item-meta">{{ requirement.status }}</div>
            </div>
            <el-button type="danger" plain @click="unassignRequirement(requirement.id)">Remove</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as projectsApi from '../../api/projects'
import * as requirementsApi from '../../api/requirements'
import * as sprintsApi from '../../api/sprints'
import * as tasksApi from '../../api/tasks'
import { useProjectStore } from '../../stores/project.store'
import type { Requirement, Task } from '../../types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const projectId = computed(() => Number(route.params.id))
const sprintId = computed(() => Number(route.params.sid))

const sprint = ref<any>(null)
const tasks = ref<Task[]>([])
const requirements = ref<Requirement[]>([])
const members = ref<Array<{ id: number; full_name: string }>>([])

const draggedTaskId = ref<number | null>(null)
const draggedRequirementId = ref<number | null>(null)
const dragTaskTarget = ref<'backlog' | 'sprint' | null>(null)
const dragRequirementTarget = ref<'backlog' | 'sprint' | null>(null)

const taskFilters = reactive({
  search: '',
  assignee_id: null as number | null,
  priority: '',
  status: ''
})

const requirementFilters = reactive({
  search: '',
  priority: '',
  status: ''
})

const backlogTasks = computed(() => tasks.value.filter((task) => !task.sprint_id))
const sprintTasks = computed(() => tasks.value.filter((task) => task.sprint_id === sprintId.value))

const backlogRequirements = computed(() => requirements.value.filter((requirement) => !requirement.sprint_id))
const sprintRequirements = computed(() => requirements.value.filter((requirement) => requirement.sprint_id === sprintId.value))

function filterTasks(list: Task[]) {
  return list.filter((task) => {
    if (taskFilters.search && !task.title.toLowerCase().includes(taskFilters.search.toLowerCase())) return false
    if (taskFilters.assignee_id && task.assignee_id !== taskFilters.assignee_id) return false
    if (taskFilters.priority && task.priority !== taskFilters.priority) return false
    if (taskFilters.status && task.status !== taskFilters.status) return false
    return true
  })
}

function filterRequirements(list: Requirement[]) {
  return list.filter((requirement) => {
    const query = requirementFilters.search.toLowerCase()
    if (query && !`${requirement.code} ${requirement.title}`.toLowerCase().includes(query)) return false
    if (requirementFilters.priority && requirement.priority !== requirementFilters.priority) return false
    if (requirementFilters.status && requirement.status !== requirementFilters.status) return false
    return true
  })
}

const filteredBacklogTasks = computed(() => filterTasks(backlogTasks.value))
const filteredSprintTasks = computed(() => filterTasks(sprintTasks.value))
const filteredBacklogRequirements = computed(() => filterRequirements(backlogRequirements.value))
const filteredSprintRequirements = computed(() => filterRequirements(sprintRequirements.value))

function resetFilters() {
  Object.assign(taskFilters, { search: '', assignee_id: null, priority: '', status: '' })
  Object.assign(requirementFilters, { search: '', priority: '', status: '' })
}

async function loadData() {
  const [sprintResp, tasksResp, requirementsResp, membersResp] = await Promise.all([
    sprintsApi.getSprint(projectId.value, sprintId.value),
    tasksApi.getTasks(projectId.value),
    requirementsApi.getRequirements(projectId.value),
    projectsApi.getProjectMembers(projectId.value)
  ])

  sprint.value = sprintResp.data
  tasks.value = tasksResp.data
  requirements.value = requirementsResp.data
  members.value = membersResp.data
}

function startTaskDrag(taskId: number) {
  draggedTaskId.value = taskId
}

function startRequirementDrag(requirementId: number) {
  draggedRequirementId.value = requirementId
}

async function assignTask(taskId: number, silent = false) {
  const task = tasks.value.find((item) => item.id === taskId)
  if (!task || task.sprint_id === sprintId.value) return
  const { data } = await tasksApi.updateTask(projectId.value, taskId, { sprint_id: sprintId.value })
  const index = tasks.value.findIndex((item) => item.id === taskId)
  if (index >= 0) tasks.value[index] = data
  if (!silent) ElMessage.success('Task assigned to sprint')
}

async function unassignTask(taskId: number, silent = false) {
  const task = tasks.value.find((item) => item.id === taskId)
  if (!task || !task.sprint_id) return
  const { data } = await tasksApi.updateTask(projectId.value, taskId, { sprint_id: null })
  const index = tasks.value.findIndex((item) => item.id === taskId)
  if (index >= 0) tasks.value[index] = data
  if (!silent) ElMessage.success('Task removed from sprint')
}

async function assignRequirement(requirementId: number, silent = false) {
  const requirement = requirements.value.find((item) => item.id === requirementId)
  if (!requirement || requirement.sprint_id === sprintId.value) return
  const { data } = await requirementsApi.updateRequirement(projectId.value, requirementId, {
    sprint_id: sprintId.value,
    change_comment: `Assigned to sprint ${sprintId.value}`
  })
  const index = requirements.value.findIndex((item) => item.id === requirementId)
  if (index >= 0) requirements.value[index] = data
  if (!silent) ElMessage.success('Requirement assigned to sprint')
}

async function unassignRequirement(requirementId: number, silent = false) {
  const requirement = requirements.value.find((item) => item.id === requirementId)
  if (!requirement || !requirement.sprint_id) return
  const { data } = await requirementsApi.updateRequirement(projectId.value, requirementId, {
    sprint_id: null,
    change_comment: `Unassigned from sprint ${sprintId.value}`
  })
  const index = requirements.value.findIndex((item) => item.id === requirementId)
  if (index >= 0) requirements.value[index] = data
  if (!silent) ElMessage.success('Requirement removed from sprint')
}

async function dropTaskTo(target: 'backlog' | 'sprint') {
  if (!draggedTaskId.value) return
  const taskId = draggedTaskId.value
  draggedTaskId.value = null
  dragTaskTarget.value = null
  if (target === 'sprint') {
    await assignTask(taskId, true)
    ElMessage.success('Task moved to sprint')
    return
  }
  await unassignTask(taskId, true)
  ElMessage.success('Task moved to backlog')
}

async function dropRequirementTo(target: 'backlog' | 'sprint') {
  if (!draggedRequirementId.value) return
  const requirementId = draggedRequirementId.value
  draggedRequirementId.value = null
  dragRequirementTarget.value = null
  if (target === 'sprint') {
    await assignRequirement(requirementId, true)
    ElMessage.success('Requirement moved to sprint')
    return
  }
  await unassignRequirement(requirementId, true)
  ElMessage.success('Requirement moved to backlog')
}

onMounted(async () => {
  await projectStore.fetchOne(projectId.value)
  await loadData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.drop-zone {
  border: 1px solid transparent;
  transition: border-color 0.15s ease;
}

.drop-zone.dragging {
  border-color: #409eff;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
  cursor: grab;
}

.item-main {
  min-width: 0;
}

.item-title {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}
</style>
