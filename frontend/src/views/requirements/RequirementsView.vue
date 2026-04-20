<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Требования</h2>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="showForm = true" v-if="auth.canPermission('requirements.manage')">
          Новое требование
        </el-button>
        <el-button v-if="auth.canPermission('requirements.delete_restore')" @click="openTrash">Корзина</el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom:16px">
      <el-row :gutter="12" class="filter-grid">
        <el-col :span="6">
          <el-input v-model="filters.search" placeholder="Поиск..." clearable @input="load" :prefix-icon="Search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" clearable placeholder="Статус" @change="load" style="width:100%">
            <el-option v-for="(label, value) in reqStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.type" clearable placeholder="Тип" @change="load" style="width:100%">
            <el-option v-for="(label, value) in typeLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.priority" clearable placeholder="Приоритет" @change="load" style="width:100%">
            <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-table :data="requirements" stripe @row-click="openRow">
      <el-table-column prop="code" label="Код" width="90" />
      <el-table-column prop="title" label="Название" min-width="220" />
      <el-table-column label="Тип" width="140">
        <template #default="{ row }">{{ typeLabel[row.type] }}</template>
      </el-table-column>
      <el-table-column label="Приоритет" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="priorityType[row.priority] as any">{{ priorityLabel[row.priority] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Статус" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="reqStatusType[row.status] as any">{{ reqStatusLabel[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="author_name" label="Автор" width="150" />
      <el-table-column prop="version" label="Версия" width="80" />
      <el-table-column label="Действия" width="130">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="danger" text
              v-if="auth.canPermission('requirements.delete_restore')"
              @click.stop="deleteReq(row)"
            >
              Удалить
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" title="Новое требование" width="560px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Название" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="Описание"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Тип">
              <el-select v-model="form.type" style="width:100%">
                <el-option v-for="(label, value) in typeLabel" :key="value" :label="label" :value="value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Приоритет">
              <el-select v-model="form.priority" style="width:100%">
                <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Исполнитель">
              <el-select v-model="form.assignee_id" clearable style="width:100%">
                <el-option v-for="member in members" :key="member.id" :label="member.full_name" :value="member.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">Отмена</el-button>
        <el-button type="primary" @click="createReq">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTrash" title="Корзина требований" width="840px">
      <el-empty v-if="!deletedRequirements.length" description="Корзина пуста" />
      <el-table v-else :data="deletedRequirements" stripe>
        <el-table-column prop="code" label="Код" width="90" />
        <el-table-column prop="title" label="Название" min-width="220" />
        <el-table-column prop="status" label="Статус" width="130" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as reqApi from '../../api/requirements'
import * as projectsApi from '../../api/projects'
import { useAuthStore } from '../../stores/auth.store'
import { reqStatusLabel, reqStatusType, priorityLabel, priorityType, typeLabel } from '../../utils/labels'
import type { Requirement } from '../../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pid = computed(() => Number(route.params.id))

const requirements = ref<Requirement[]>([])
const deletedRequirements = ref<any[]>([])
const members = ref<any[]>([])
const showForm = ref(false)
const showTrash = ref(false)
const filters = reactive({ search: '', status: '', type: '', priority: '' })
const form = reactive({ title: '', description: '', type: 'functional', priority: 'medium', assignee_id: null as number | null })

async function load() {
  const { data } = await reqApi.getRequirements(pid.value, filters)
  requirements.value = data
}

onMounted(async () => {
  await load()
  const { data } = await projectsApi.getProjectMembers(pid.value)
  members.value = data
})

function openRow(row: Requirement) {
  router.push(`/projects/${pid.value}/requirements/${row.id}`)
}

async function createReq() {
  if (!form.title.trim()) return
  const { data } = await reqApi.createRequirement(pid.value, form)
  requirements.value.unshift(data)
  showForm.value = false
  Object.assign(form, { title: '', description: '', type: 'functional', priority: 'medium', assignee_id: null })
  ElMessage.success('Требование создано')
}

async function deleteReq(row: Requirement) {
  await ElMessageBox.confirm(`Удалить ${row.code}?`, 'Подтверждение', { type: 'warning' })
  await reqApi.deleteRequirement(pid.value, row.id)
  requirements.value = requirements.value.filter((item) => item.id !== row.id)
  ElMessage.success('Требование перемещено в корзину')
}

async function openTrash() {
  const { data } = await reqApi.getDeletedRequirements(pid.value)
  deletedRequirements.value = data
  showTrash.value = true
}

async function restore(id: number) {
  await reqApi.restoreRequirement(pid.value, id)
  await openTrash()
  await load()
  ElMessage.success('Требование восстановлено')
}

async function purge(id: number) {
  await ElMessageBox.confirm('Удалить требование безвозвратно?', 'Подтверждение', { type: 'warning' })
  await reqApi.purgeRequirement(pid.value, id)
  await openTrash()
  ElMessage.success('Требование удалено')
}
</script>

<style scoped>
.el-table { cursor: pointer; }
</style>

