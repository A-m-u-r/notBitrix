<template>
  <div>
    <h2 class="page-title">Дашборд</h2>

    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="s in stats" :key="s.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-body">
            <el-icon :size="32" :color="s.color"><component :is="s.icon" /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><b>Требования по статусам</b></template>
          <Pie v-if="reqChartData" :data="reqChartData" :options="{ responsive: true, plugins: { legend: { position: 'right' } } }" style="max-height:220px" />
          <el-empty v-else description="Нет данных" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><b>Баги по серьёзности</b></template>
          <Bar v-if="bugChartData" :data="bugChartData" :options="{ responsive: true, plugins: { legend: { display: false } } }" style="max-height:220px" />
          <el-empty v-else description="Нет данных" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover">
      <template #header><b>Последняя активность</b></template>
      <el-table :data="activity" size="small">
        <el-table-column label="Тип" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'bug' ? 'danger' : 'primary'">
              {{ row.type === 'bug' ? 'Баг' : 'Задача' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Название" />
        <el-table-column prop="status" label="Статус" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="taskStatusType[row.status] || 'info'">
              {{ taskStatusLabel[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="user_name" label="Исполнитель" width="160" />
        <el-table-column prop="updated_at" label="Обновлено" width="160">
          <template #default="{ row }">{{ row.updated_at?.slice(0,16).replace('T',' ') }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Pie, Bar } from 'vue-chartjs'
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { getDashboard } from '../../api/users'
import { taskStatusLabel, taskStatusType } from '../../utils/labels'

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const data = ref<any>(null)

const stats = computed(() => data.value ? [
  { label: 'Всего требований', value: data.value.totalReqs, color: '#409eff', icon: 'List' },
  { label: 'Открытых багов', value: data.value.openBugs, color: '#f56c6c', icon: 'Warning' },
  { label: 'Активных спринтов', value: data.value.activeSprints, color: '#67c23a', icon: 'Timer' },
  { label: 'Проектов', value: data.value.totalProjects, color: '#e6a23c', icon: 'Grid' },
] : [])

const REQ_STATUS_COLORS: Record<string, string> = {
  draft: '#909399', review: '#e6a23c', approved: '#67c23a',
  implemented: '#409eff', verified: '#67c23a', rejected: '#f56c6c'
}
const REQ_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', review: 'На проверке', approved: 'Утверждено',
  implemented: 'Реализовано', verified: 'Проверено', rejected: 'Отклонено'
}

const reqChartData = computed(() => {
  if (!data.value?.reqByStatus?.length) return null
  const items = data.value.reqByStatus
  return {
    labels: items.map((i: any) => REQ_STATUS_LABELS[i.status] || i.status),
    datasets: [{ data: items.map((i: any) => i.count), backgroundColor: items.map((i: any) => REQ_STATUS_COLORS[i.status] || '#ccc') }]
  }
})

const BUG_SEVERITY_COLORS: Record<string, string> = {
  blocker: '#c0392b', critical: '#f56c6c', major: '#e67e22', normal: '#409eff', minor: '#95a5a6', trivial: '#bdc3c7'
}
const BUG_LABELS: Record<string, string> = {
  blocker: 'Блокер', critical: 'Критический', major: 'Мажорный', normal: 'Нормальный', minor: 'Минорный', trivial: 'Тривиальный'
}

const bugChartData = computed(() => {
  if (!data.value?.bugsBySeverity?.length) return null
  const items = data.value.bugsBySeverity
  return {
    labels: items.map((i: any) => BUG_LABELS[i.severity] || i.severity),
    datasets: [{ data: items.map((i: any) => i.count), backgroundColor: items.map((i: any) => BUG_SEVERITY_COLORS[i.severity] || '#ccc') }]
  }
})

const activity = computed(() => data.value?.recentActivity || [])

onMounted(async () => {
  const { data: d } = await getDashboard()
  data.value = d
})
</script>

<style scoped>
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #303133; }
.stat-card { cursor: default; }
.stat-body { display: flex; align-items: center; gap: 16px; }
.stat-value { font-size: 28px; font-weight: 700; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 2px; }
</style>
