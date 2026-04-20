<template>
  <div v-if="requirement">
    <el-page-header @back="router.push(`/projects/${projectId}/requirements`)">
      <template #content>
        <div style="display: flex; align-items: center; gap: 8px;">
          <el-tag>{{ requirement.code }}</el-tag>
          <strong>{{ requirement.title }}</strong>
        </div>
      </template>
      <template #extra>
        <div class="page-actions">
          <el-button v-if="canEdit && !editMode" @click="startEdit">Редактировать</el-button>
          <el-button v-if="editMode" @click="cancelEdit">Отмена</el-button>
          <el-button v-if="editMode" type="primary" @click="saveEdit">Сохранить</el-button>
        </div>
      </template>
    </el-page-header>

    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>Описание</template>
          <el-input
            v-if="editMode"
            v-model="editForm.title"
            placeholder="Название"
            style="margin-bottom: 12px;"
          />
          <el-input
            v-if="editMode"
            v-model="editForm.description"
            type="textarea"
            :rows="8"
            placeholder="Описание"
          />
          <div v-else style="white-space: pre-wrap;">{{ requirement.description || '—' }}</div>
        </el-card>

        <el-card shadow="never" style="margin-top: 12px;">
          <template #header>Связанные требования</template>

          <div style="display: flex; gap: 8px; margin-bottom: 10px;" v-if="canEdit">
            <el-select v-model="linkForm.target_id" filterable placeholder="Выберите требование" style="width: 100%;">
              <el-option
                v-for="item in linkCandidates"
                :key="item.id"
                :label="`${item.code} — ${item.title}`"
                :value="item.id"
              />
            </el-select>
            <el-select v-model="linkForm.link_type" style="width: 180px;">
              <el-option label="Зависит от" value="depends_on" />
              <el-option label="Уточняет" value="refines" />
              <el-option label="Конфликтует" value="conflicts" />
              <el-option label="Дублирует" value="duplicates" />
            </el-select>
            <el-button type="primary" @click="addLink">Добавить</el-button>
          </div>

          <el-empty v-if="!links.length" description="Нет связей" :image-size="40" />
          <div v-for="link in links" :key="link.id" class="link-row">
            <el-tag size="small">{{ link.link_type }}</el-tag>
            <el-link @click="router.push(`/projects/${projectId}/requirements/${link.target_requirement_id}`)">
              {{ link.target_code }} — {{ link.target_title }}
            </el-link>
              <div class="table-actions">
                <el-button
                  v-if="canEdit"
                  type="danger"
                  text
                  @click="removeLink(link.id)"
                >
                  Удалить
                </el-button>
              </div>
          </div>
        </el-card>

        <el-card shadow="never" style="margin-top: 12px;">
          <template #header>Комментарии</template>
          <el-empty v-if="!comments.length" description="Нет комментариев" :image-size="40" />
          <div v-for="comment in comments" :key="comment.id" class="comment">
            <strong>{{ comment.author_name }}</strong>
            <span style="margin-left: 8px; color: #909399; font-size: 12px;">
              {{ comment.created_at?.slice(0, 16).replace('T', ' ') }}
            </span>
            <div style="margin-top: 4px;">{{ comment.body }}</div>
          </div>
          <el-input
            v-model="commentText"
            type="textarea"
            :rows="3"
            placeholder="Добавить комментарий"
            style="margin-top: 10px;"
          />
          <el-button type="primary" style="margin-top: 10px;" @click="addComment">Отправить</el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never">
          <template #header>Свойства</template>
          <el-form label-position="left" label-width="110px">
            <el-form-item label="Статус">
              <el-select
                v-if="editMode"
                v-model="editForm.status"
                style="width: 100%;"
              >
                <el-option v-for="(label, value) in reqStatusLabel" :key="value" :label="label" :value="value" />
              </el-select>
              <el-tag v-else :type="reqStatusType[requirement.status] as any">
                {{ reqStatusLabel[requirement.status] }}
              </el-tag>
            </el-form-item>

            <el-form-item label="Приоритет">
              <el-select
                v-if="editMode"
                v-model="editForm.priority"
                style="width: 100%;"
              >
                <el-option v-for="(label, value) in priorityLabel" :key="value" :label="label" :value="value" />
              </el-select>
              <el-tag v-else :type="priorityType[requirement.priority] as any">
                {{ priorityLabel[requirement.priority] }}
              </el-tag>
            </el-form-item>

            <el-form-item label="Тип">
              <el-select
                v-if="editMode"
                v-model="editForm.type"
                style="width: 100%;"
              >
                <el-option v-for="(label, value) in typeLabel" :key="value" :label="label" :value="value" />
              </el-select>
              <span v-else>{{ typeLabel[requirement.type] }}</span>
            </el-form-item>

            <el-form-item label="Версия">v{{ requirement.version }}</el-form-item>
            <el-form-item label="Автор">{{ requirement.author_name || '—' }}</el-form-item>
            <el-form-item label="Исполнитель">{{ requirement.assignee_name || '—' }}</el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" style="margin-top: 12px;">
          <template #header>История</template>
          <el-timeline>
            <el-timeline-item
              v-for="item in history"
              :key="item.id"
              :timestamp="`v${item.version} — ${item.changed_at?.slice(0, 16).replace('T', ' ')}`"
            >
              {{ item.changed_by_name }}: {{ item.change_comment }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <el-skeleton v-else :rows="8" animated />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import * as requirementsApi from '../../api/requirements'
import { useAuthStore } from '../../stores/auth.store'
import { priorityLabel, priorityType, reqStatusLabel, reqStatusType, typeLabel } from '../../utils/labels'
import type { Requirement } from '../../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const projectId = computed(() => Number(route.params.id))
const requirementId = computed(() => Number(route.params.rid))
const canEdit = computed(() => auth.canPermission('requirements.manage'))

const requirement = ref<Requirement | null>(null)
const allRequirements = ref<Requirement[]>([])
const history = ref<any[]>([])
const links = ref<any[]>([])
const comments = ref<any[]>([])
const commentText = ref('')
const editMode = ref(false)

const editForm = reactive({
  title: '',
  description: '',
  status: 'draft',
  priority: 'medium',
  type: 'functional'
})

const linkForm = reactive({
  target_id: null as number | null,
  link_type: 'depends_on'
})

const linkCandidates = computed(() =>
  allRequirements.value.filter((item) => item.id !== requirement.value?.id)
)

async function loadRequirement() {
  const { data } = await requirementsApi.getRequirement(projectId.value, requirementId.value)
  requirement.value = data
}

async function loadAuxData() {
  const [h, l, r, c] = await Promise.all([
    requirementsApi.getHistory(projectId.value, requirementId.value),
    requirementsApi.getLinks(projectId.value, requirementId.value),
    requirementsApi.getRequirements(projectId.value),
    requirementsApi.getRequirementComments(projectId.value, requirementId.value)
  ])

  history.value = h.data
  links.value = l.data
  allRequirements.value = r.data
  comments.value = c.data
}

function startEdit() {
  if (!requirement.value) return
  editForm.title = requirement.value.title
  editForm.description = requirement.value.description || ''
  editForm.status = requirement.value.status
  editForm.priority = requirement.value.priority
  editForm.type = requirement.value.type
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
}

async function saveEdit() {
  if (!requirement.value) return

  const { data: updated } = await requirementsApi.updateRequirement(projectId.value, requirementId.value, {
    title: editForm.title,
    description: editForm.description,
    priority: editForm.priority,
    type: editForm.type
  })
  requirement.value = updated

  if (updated.status !== editForm.status) {
    const { data: transitioned } = await requirementsApi.transitionStatus(projectId.value, requirementId.value, editForm.status)
    requirement.value = transitioned
  }

  editMode.value = false
  await loadAuxData()
  ElMessage.success('Требование обновлено')
}

async function addLink() {
  if (!linkForm.target_id) return
  await requirementsApi.addLink(projectId.value, requirementId.value, linkForm)
  linkForm.target_id = null
  await loadAuxData()
}

async function removeLink(linkId: number) {
  await requirementsApi.removeLink(projectId.value, requirementId.value, linkId)
  links.value = links.value.filter((item) => item.id !== linkId)
}

async function addComment() {
  const body = commentText.value.trim()
  if (!body) return

  const { data } = await requirementsApi.addRequirementComment(projectId.value, requirementId.value, body)
  comments.value.push(data)
  commentText.value = ''
}

onMounted(async () => {
  await loadRequirement()
  await loadAuxData()
})
</script>

<style scoped>
.comment {
  border-left: 3px solid #e5eaf3;
  padding: 6px 10px;
  margin-bottom: 8px;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f2f5;
}
</style>
