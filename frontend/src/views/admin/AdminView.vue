<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Admin Panel</h2>
      <el-space class="page-actions">
        <el-button @click="router.push('/team')">Manage Team</el-button>
        <el-button type="primary" @click="loadAll">Refresh</el-button>
      </el-space>
    </div>

    <el-row :gutter="12" style="margin-bottom: 12px;">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ users.length }}</div>
          <div class="stat-label">Users</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ activeUsersCount }}</div>
          <div class="stat-label">Active Users</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ dashboard?.totalProjects || 0 }}</div>
          <div class="stat-label">Projects</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ dashboard?.openBugs || 0 }}</div>
          <div class="stat-label">Open Bugs</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><strong>Users by Role</strong></template>
          <el-table :data="roleDistribution" size="small">
            <el-table-column prop="role" label="Role" />
            <el-table-column prop="count" label="Count" width="100" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never">
          <template #header><strong>Team Delivery Snapshot</strong></template>
          <el-table :data="teamTop" size="small">
            <el-table-column prop="full_name" label="User" min-width="150" />
            <el-table-column prop="done_tasks" label="Done Tasks" width="110" />
            <el-table-column label="Completion %" width="120">
              <template #default="{ row }">
                {{ completionPercent(row.done_tasks, row.total_tasks) }}%
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 12px;">
      <template #header><strong>Inactive Users</strong></template>
      <el-empty v-if="!inactiveUsers.length" description="No inactive users" />
      <el-table v-else :data="inactiveUsers" size="small">
        <el-table-column prop="full_name" label="Name" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role_name" label="Role" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as usersApi from '../../api/users'
import type { User } from '../../types'

const router = useRouter()

const users = ref<User[]>([])
const dashboard = ref<any>(null)
const team = ref<any>(null)

const activeUsersCount = computed(() => users.value.filter((user) => user.is_active).length)
const inactiveUsers = computed(() => users.value.filter((user) => !user.is_active))

const roleDistribution = computed(() => {
  const map = new Map<string, number>()
  users.value.forEach((user) => {
    map.set(user.role_name, (map.get(user.role_name) || 0) + 1)
  })
  return Array.from(map.entries()).map(([role, count]) => ({ role, count }))
})

const teamTop = computed(() => {
  const rows = team.value?.tasksByUser || []
  return rows.slice(0, 8)
})

function completionPercent(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

async function loadAll() {
  const [usersResp, dashboardResp, teamResp] = await Promise.all([
    usersApi.getUsers(),
    usersApi.getDashboard(),
    usersApi.getTeamAnalytics()
  ])
  users.value = usersResp.data
  dashboard.value = dashboardResp.data
  team.value = teamResp.data
}

onMounted(loadAll)
</script>

<style scoped>
.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  color: #909399;
  margin-top: 4px;
}
</style>
