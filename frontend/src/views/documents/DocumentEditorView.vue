<template>
  <div v-if="doc">
    <el-breadcrumb separator="/" style="margin-bottom:12px">
      <el-breadcrumb-item :to="`/projects/${pid}/documents`">Документы</el-breadcrumb-item>
      <el-breadcrumb-item>{{ doc.title }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="editor-header">
      <div>
        <h2 class="doc-title" v-if="!editTitle">{{ doc.title }}</h2>
        <el-input v-else v-model="titleDraft" size="large" @blur="saveTitle" @keyup.enter="saveTitle" style="width:400px" />
        <span class="doc-meta">v{{ doc.version }} · {{ doc.author_name }} · {{ doc.updated_at?.slice(0,16).replace('T',' ') }}</span>
      </div>
      <div class="page-actions">
        <el-button v-if="canEdit && !editTitle" @click="startTitleEdit">Переименовать</el-button>
        <el-button @click="showHistory = true">История (v{{ doc.version }})</el-button>
        <el-tag type="success" v-if="saved" size="small">Сохранено</el-tag>
      </div>
    </div>

    <el-card shadow="never" style="margin-top:12px">
      <el-input
        v-model="content"
        type="textarea"
        :rows="30"
        :disabled="!canEdit"
        placeholder="Введите содержание документа..."
        @input="onInput"
        style="font-family:monospace;font-size:13px"
      />
    </el-card>

    <!-- History drawer -->
    <el-drawer v-model="showHistory" title="История версий" size="480px">
      <el-timeline>
        <el-timeline-item v-for="v in history" :key="v.id"
          :timestamp="`v${v.version} — ${v.changed_at?.slice(0,16).replace('T',' ')}`"
          placement="top">
          <el-card size="small">
            <p><b>{{ v.changed_by_name }}</b></p>
            <p style="color:#909399;font-size:12px">{{ v.change_comment || '—' }}</p>
            <el-button @click="restoreVersion(v)">Восстановить</el-button>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
  <el-skeleton v-else :rows="10" animated />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as docsApi from '../../api/documents'
import { useAuthStore } from '../../stores/auth.store'

const route = useRoute()
const auth = useAuthStore()
const pid = computed(() => Number(route.params.id))
const did = computed(() => Number(route.params.did))

const doc = ref<any>(null)
const history = ref<any[]>([])
const content = ref('')
const showHistory = ref(false)
const saved = ref(false)
const editTitle = ref(false)
const titleDraft = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

const canEdit = computed(() => auth.canPermission('documents.manage'))

onMounted(async () => {
  const [d, h] = await Promise.all([
    docsApi.getDocument(pid.value, did.value),
    docsApi.getDocHistory(pid.value, did.value)
  ])
  doc.value = d.data
  content.value = d.data.content || ''
  history.value = h.data
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

function onInput() {
  saved.value = false
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(autoSave, 1500)
}

async function autoSave() {
  if (!doc.value || !canEdit.value) return
  const { data } = await docsApi.updateDocument(pid.value, did.value, { content: content.value })
  doc.value = data
  saved.value = true
  const { data: h } = await docsApi.getDocHistory(pid.value, did.value)
  history.value = h
}

function startTitleEdit() {
  titleDraft.value = doc.value.title
  editTitle.value = true
}

async function saveTitle() {
  if (!titleDraft.value.trim()) { editTitle.value = false; return }
  const { data } = await docsApi.updateDocument(pid.value, did.value, { title: titleDraft.value })
  doc.value = data
  editTitle.value = false
  ElMessage.success('Название обновлено')
}

async function restoreVersion(v: any) {
  const { data } = await docsApi.updateDocument(pid.value, did.value, {
    content: v.content,
    change_comment: `Восстановлено из v${v.version}`
  })
  doc.value = data
  content.value = data.content || ''
  showHistory.value = false
  const { data: h } = await docsApi.getDocHistory(pid.value, did.value)
  history.value = h
  ElMessage.success(`Версия v${v.version} восстановлена`)
}
</script>

<style scoped>
.editor-header { display: flex; justify-content: space-between; align-items: flex-start; }
.doc-title { font-size: 22px; font-weight: 700; color: #303133; margin-bottom: 4px; }
.doc-meta { font-size: 12px; color: #c0c4cc; }
</style>
