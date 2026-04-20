<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Баги</h2>
      <div class="page-actions">
        <el-button v-if="auth.canPermission('bugs.manage')" type="primary" :icon="Plus" @click="showForm = true">Новый баг</el-button>
        <el-button v-if="auth.canPermission('bugs.delete_restore')" @click="openTrash">Корзина</el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom:16px">
      <el-row :gutter="12" class="filter-grid">
        <el-col :span="6">
          <el-input v-model="filters.search" placeholder="Поиск..." clearable @input="load" :prefix-icon="Search" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" clearable placeholder="Статус" @change="load" style="width:100%">
            <el-option v-for="(label, value) in bugStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.severity" clearable placeholder="Серьезность" @change="load" style="width:100%">
            <el-option v-for="(label, value) in severityLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.priority" clearable placeholder="Приоритет" @change="load" style="width:100%">
            <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-table :data="bugs" stripe @row-click="openBug">
      <el-table-column prop="title" label="Название" min-width="220" />
      <el-table-column label="Серьезность" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="severityType[row.severity] as any">{{ severityLabel[row.severity] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Приоритет" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="priorityType[row.priority] as any">{{ priorityLabel[row.priority] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Статус" width="150">
        <template #default="{ row }">
          <el-tag size="small" :type="bugStatusType[row.status] as any">{{ bugStatusLabel[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="assignee_name" label="Исполнитель" width="150" />
      <el-table-column prop="reporter_name" label="Репортер" width="150" />
      <el-table-column label="Действия" width="120">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="danger" text
              v-if="auth.canPermission('bugs.delete_restore')"
              @click.stop="deleteBug(row)"
            >
              Удалить
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" title="Новый баг" width="560px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Название" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="Описание"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="Шаги воспроизведения"><el-input v-model="form.steps_to_reproduce" type="textarea" :rows="3" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Серьезность">
              <el-select v-model="form.severity" style="width:100%">
                <el-option v-for="(label, value) in severityLabel" :key="value" :label="label" :value="value" />
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
        <el-button type="primary" @click="createBug">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTrash" title="Корзина багов" width="840px">
      <el-empty v-if="!deletedBugs.length" description="Корзина пуста" />
      <el-table v-else :data="deletedBugs" stripe>
        <el-table-column prop="title" label="Баг" min-width="260" />
        <el-table-column prop="severity" label="Серьезность" width="140" />
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

    <el-drawer v-model="showDetail" :title="selected?.title" size="520px">
      <div v-if="selected">
        <el-form label-position="left" label-width="130px" size="small">
          <el-form-item label="Статус">
            <el-select v-model="selected.status" @change="saveStatus" style="width:100%">
              <el-option v-for="(label, value) in bugStatusLabel" :key="value" :label="label" :value="value" />
            </el-select>
          </el-form-item>
          <el-form-item label="Серьезность">
            <el-tag :type="severityType[selected.severity] as any" size="small">{{ severityLabel[selected.severity] }}</el-tag>
          </el-form-item>
          <el-form-item label="Приоритет">
            <el-tag :type="priorityType[selected.priority] as any" size="small">{{ priorityLabel[selected.priority] }}</el-tag>
          </el-form-item>
          <el-form-item label="Исполнитель"><span>{{ selected.assignee_name || '—' }}</span></el-form-item>
          <el-form-item label="Репортер"><span>{{ selected.reporter_name }}</span></el-form-item>
          <el-form-item label="Создано"><span>{{ selected.created_at?.slice(0,10) }}</span></el-form-item>
        </el-form>
        <el-divider />
        <b>Описание</b>
        <p style="color:#606266;margin-top:8px;white-space:pre-wrap">{{ selected.description || '—' }}</p>
        <template v-if="selected.steps_to_reproduce">
          <b>Шаги воспроизведения</b>
          <p style="color:#606266;margin-top:8px;white-space:pre-wrap">{{ selected.steps_to_reproduce }}</p>
        </template>
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
import * as bugsApi from '../../api/bugs'
import * as projectsApi from '../../api/projects'
import { useAuthStore } from '../../stores/auth.store'
import { bugStatusLabel, bugStatusType, severityLabel, severityType, priorityLabel, priorityType } from '../../utils/labels'

const route = useRoute()
const auth = useAuthStore()
const pid = computed(() => Number(route.params.id))

const bugs = ref<any[]>([])
const deletedBugs = ref<any[]>([])
const members = ref<any[]>([])
const showForm = ref(false)
const showTrash = ref(false)
const showDetail = ref(false)
const selected = ref<any | null>(null)
const comments = ref<any[]>([])
const commentText = ref('')

const filters = reactive({ search: '', status: '', severity: '', priority: '' })
const form = reactive({ title: '', description: '', steps_to_reproduce: '', severity: 'normal', priority: 'medium', assignee_id: null as number | null })

async function load() {
  const { data } = await bugsApi.getBugs(pid.value, filters)
  bugs.value = data
}

onMounted(async () => {
  await load()
  const { data } = await projectsApi.getProjectMembers(pid.value)
  members.value = data
})

async function openBug(bug: any) {
  selected.value = { ...bug }
  showDetail.value = true
  const { data } = await bugsApi.getBugComments(pid.value, bug.id)
  comments.value = data
}

async function saveStatus() {
  if (!selected.value) return
  const { data } = await bugsApi.updateBug(pid.value, selected.value.id, { status: selected.value.status })
  const idx = bugs.value.findIndex((item) => item.id === data.id)
  if (idx >= 0) bugs.value[idx] = data
}

async function createBug() {
  if (!form.title.trim()) return
  const { data } = await bugsApi.createBug(pid.value, form)
  bugs.value.unshift(data)
  showForm.value = false
  Object.assign(form, { title: '', description: '', steps_to_reproduce: '', severity: 'normal', priority: 'medium', assignee_id: null })
  ElMessage.success('Баг создан')
}

async function deleteBug(row: any) {
  await ElMessageBox.confirm('Удалить баг?', 'Подтверждение', { type: 'warning' })
  await bugsApi.deleteBug(pid.value, row.id)
  bugs.value = bugs.value.filter((item) => item.id !== row.id)
  ElMessage.success('Баг перемещен в корзину')
}

async function openTrash() {
  const { data } = await bugsApi.getDeletedBugs(pid.value)
  deletedBugs.value = data
  showTrash.value = true
}

async function restore(id: number) {
  await bugsApi.restoreBug(pid.value, id)
  await openTrash()
  await load()
  ElMessage.success('Баг восстановлен')
}

async function purge(id: number) {
  await ElMessageBox.confirm('Удалить баг безвозвратно?', 'Подтверждение', { type: 'warning' })
  await bugsApi.purgeBug(pid.value, id)
  await openTrash()
  ElMessage.success('Баг удален')
}

async function addComment() {
  if (!commentText.value.trim() || !selected.value) return
  const { data } = await bugsApi.addBugComment(pid.value, selected.value.id, commentText.value)
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

