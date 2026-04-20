<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Документы</h2>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="showForm = true" v-if="auth.canPermission('documents.manage')">
          Новый документ
        </el-button>
        <el-button v-if="auth.canPermission('documents.delete_restore')" @click="openTrash">Корзина</el-button>
      </div>
    </div>

    <el-table :data="documents" stripe @row-click="openDoc">
      <el-table-column prop="title" label="Название" min-width="220" />
      <el-table-column prop="doc_type" label="Тип" width="180">
        <template #default="{ row }">{{ docTypeLabel[row.doc_type] || row.doc_type }}</template>
      </el-table-column>
      <el-table-column prop="version" label="Версия" width="90">
        <template #default="{ row }">v{{ row.version }}</template>
      </el-table-column>
      <el-table-column prop="author_name" label="Автор" width="150" />
      <el-table-column label="Изменен" width="160">
        <template #default="{ row }">{{ row.updated_at?.slice(0,16).replace('T',' ') }}</template>
      </el-table-column>
      <el-table-column label="Действия" width="120">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="danger" text
              v-if="auth.canPermission('documents.delete_restore')"
              @click.stop="deleteDoc(row)"
            >
              Удалить
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" title="Новый документ" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Название" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="Тип">
          <el-select v-model="form.doc_type" style="width:100%">
            <el-option v-for="(label, value) in docTypeLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Содержание (краткое)">
          <el-input v-model="form.content" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">Отмена</el-button>
        <el-button type="primary" @click="createDoc">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTrash" title="Корзина документов" width="840px">
      <el-empty v-if="!deletedDocuments.length" description="Корзина пуста" />
      <el-table v-else :data="deletedDocuments" stripe>
        <el-table-column prop="title" label="Документ" min-width="240" />
        <el-table-column prop="author_name" label="Автор" width="150" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as docsApi from '../../api/documents'
import { useAuthStore } from '../../stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pid = computed(() => Number(route.params.id))

const documents = ref<any[]>([])
const deletedDocuments = ref<any[]>([])
const showForm = ref(false)
const showTrash = ref(false)
const form = reactive({ title: '', doc_type: 'technical_spec', content: '' })

const docTypeLabel: Record<string, string> = {
  technical_spec: 'Техническое задание',
  design: 'Дизайн-документ',
  test_plan: 'План тестирования',
  user_manual: 'Руководство пользователя',
  other: 'Прочее'
}

onMounted(async () => {
  await load()
})

async function load() {
  const { data } = await docsApi.getDocuments(pid.value)
  documents.value = data
}

function openDoc(row: any) {
  router.push(`/projects/${pid.value}/documents/${row.id}`)
}

async function createDoc() {
  if (!form.title.trim()) return
  const { data } = await docsApi.createDocument(pid.value, form)
  documents.value.unshift(data)
  showForm.value = false
  Object.assign(form, { title: '', doc_type: 'technical_spec', content: '' })
  ElMessage.success('Документ создан')
}

async function deleteDoc(row: any) {
  await ElMessageBox.confirm('Удалить документ?', 'Подтверждение', { type: 'warning' })
  await docsApi.deleteDocument(pid.value, row.id)
  documents.value = documents.value.filter((item) => item.id !== row.id)
  ElMessage.success('Документ перемещен в корзину')
}

async function openTrash() {
  const { data } = await docsApi.getDeletedDocuments(pid.value)
  deletedDocuments.value = data
  showTrash.value = true
}

async function restore(id: number) {
  await docsApi.restoreDocument(pid.value, id)
  await openTrash()
  await load()
  ElMessage.success('Документ восстановлен')
}

async function purge(id: number) {
  await ElMessageBox.confirm('Удалить документ безвозвратно?', 'Подтверждение', { type: 'warning' })
  await docsApi.purgeDocument(pid.value, id)
  await openTrash()
  ElMessage.success('Документ удален')
}
</script>

<style scoped>
.el-table { cursor: pointer; }
</style>

