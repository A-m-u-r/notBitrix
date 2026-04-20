<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Команда и роли</h2>
      <div class="page-actions">
        <el-button v-if="canManageUsers" type="primary" @click="showCreate = true">Новый пользователь</el-button>
        <el-button v-if="canManageRoles" @click="openCreateRole">Новая роль</el-button>
      </div>
    </div>

    <el-card shadow="never" style="margin-bottom: 12px;">
      <el-row :gutter="12" class="filter-grid">
        <el-col :span="8">
          <el-input v-model="filters.search" clearable placeholder="Поиск по имени/email" @input="loadUsers" />
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.role_id" clearable placeholder="Роль" style="width: 100%;" @change="loadUsers">
            <el-option v-for="role in activeRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-table :data="users" stripe>
      <el-table-column prop="full_name" label="Имя" min-width="220" />
      <el-table-column prop="email" label="Email" min-width="220" />
      <el-table-column prop="role_name" label="Роль" width="160" />
      <el-table-column label="Статус" width="140">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? 'Активен' : 'Деактивирован' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Действия" width="360">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button v-if="canManageUsers" @click="openEdit(row)">Редактировать</el-button>
            <el-button
              v-if="canManageUsers && row.is_active"
              type="danger"
              plain
              @click="deactivate(row)"
            >
              Деактивировать
            </el-button>
            <el-button
              v-if="canActivateUsers && !row.is_active"
              type="success"
              plain
              @click="activate(row)"
            >
              Активировать
            </el-button>
            <el-button text @click="loadActivity(row)">Активность</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-card v-if="canViewRoles" shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="page-actions" style="justify-content: space-between; width: 100%;">
          <span style="font-weight: 600;">Роли и права</span>
          <el-button @click="loadRoles">Обновить</el-button>
        </div>
      </template>
      <el-table :data="roles" stripe>
        <el-table-column prop="name" label="Роль" min-width="180" />
        <el-table-column label="Self-register" width="140">
          <template #default="{ row }">
            <el-tag :type="row.allow_self_register ? 'success' : 'info'">
              {{ row.allow_self_register ? 'Да' : 'Нет' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Пользователи" width="140">
          <template #default="{ row }">{{ row.users_count || 0 }} / {{ row.active_users_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="Статус" width="140">
          <template #default="{ row }">
            <el-tag :type="row.deleted_at ? 'warning' : 'success'">
              {{ row.deleted_at ? 'В архиве' : 'Активна' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="440">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button v-if="canManageRoles" @click="openEditRole(row)">Изменить</el-button>
              <el-button v-if="canAssignPermissions && !row.deleted_at" @click="openPermissions(row)">Права</el-button>
              <el-button
                v-if="canManageRoles && !row.deleted_at && !row.is_system"
                type="danger"
                plain
                @click="archiveRole(row)"
              >
                В архив
              </el-button>
              <el-button
                v-if="canManageRoles && row.deleted_at"
                type="success"
                plain
                @click="restoreRole(row)"
              >
                Восстановить
              </el-button>
              <el-button
                v-if="canManageRoles && row.deleted_at && !row.is_system"
                type="danger"
                text
                @click="purgeRole(row)"
              >
                Удалить навсегда
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="showActivity" size="520px" title="Последняя активность">
      <el-empty v-if="!activity.length" description="Нет записей" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="item in activity"
          :key="`${item.entity_type}-${item.id}`"
          :timestamp="item.updated_at?.slice(0, 16).replace('T', ' ')"
        >
          <el-tag size="small" :type="item.entity_type === 'bug' ? 'danger' : 'primary'">
            {{ item.entity_type }}
          </el-tag>
          <span style="margin-left: 8px;">{{ item.title }}</span>
          <div style="color: #909399; font-size: 12px;">{{ item.status }}</div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>

    <el-dialog v-model="showCreate" title="Создать пользователя" width="480px">
      <el-form :model="createForm" label-position="top">
        <el-form-item label="Имя" required>
          <el-input v-model="createForm.full_name" />
        </el-form-item>
        <el-form-item label="Email" required>
          <el-input v-model="createForm.email" />
        </el-form-item>
        <el-form-item label="Пароль" required>
          <el-input v-model="createForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Роль" required>
          <el-select v-model="createForm.role_id" style="width: 100%;">
            <el-option v-for="role in activeRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">Отмена</el-button>
        <el-button type="primary" @click="createUser">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEdit" title="Редактировать пользователя" width="460px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="Имя">
          <el-input v-model="editForm.full_name" />
        </el-form-item>
        <el-form-item label="Роль">
          <el-select v-model="editForm.role_id" style="width: 100%;">
            <el-option v-for="role in activeRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">Отмена</el-button>
        <el-button type="primary" @click="saveEdit">Сохранить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRoleForm" :title="editingRoleId ? 'Редактировать роль' : 'Новая роль'" width="500px">
      <el-form :model="roleForm" label-position="top">
        <el-form-item label="Название роли" required>
          <el-input v-model="roleForm.name" />
        </el-form-item>
        <el-form-item label="Саморегистрация">
          <el-switch v-model="roleForm.allow_self_register" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRoleForm = false">Отмена</el-button>
        <el-button type="primary" @click="saveRole">Сохранить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPermissions" title="Права роли" width="640px">
      <el-form label-position="top">
        <el-form-item label="Разрешения">
          <el-checkbox-group v-model="selectedPermissions">
            <el-row :gutter="10">
              <el-col v-for="permission in allPermissions" :key="permission.key" :span="12" style="margin-bottom: 8px;">
                <el-checkbox :label="permission.key">
                  <div style="display: inline-flex; flex-direction: column;">
                    <span>{{ permission.key }}</span>
                    <small style="color: #909399;">{{ permission.name }}</small>
                  </div>
                </el-checkbox>
              </el-col>
            </el-row>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPermissions = false">Отмена</el-button>
        <el-button type="primary" @click="savePermissions">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth.store'
import * as usersApi from '../../api/users'
import type { User } from '../../types'

const auth = useAuthStore()
const canManageUsers = computed(() => auth.canPermission('users.manage'))
const canActivateUsers = computed(() => auth.canPermission('users.activate'))
const canViewRoles = computed(() => auth.canPermission('roles.view'))
const canManageRoles = computed(() => auth.canPermission('roles.manage'))
const canAssignPermissions = computed(() => auth.canPermission('roles.assign_permissions'))

const users = ref<User[]>([])
const roles = ref<Array<any>>([])
const allPermissions = ref<Array<{ key: string; name: string }>>([])
const activity = ref<any[]>([])
const showActivity = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const showRoleForm = ref(false)
const showPermissions = ref(false)
const editingRoleId = ref<number | null>(null)
const permissionsRoleId = ref<number | null>(null)
const selectedPermissions = ref<string[]>([])

const filters = reactive({
  search: '',
  role_id: null as number | null
})

const createForm = reactive({
  email: '',
  full_name: '',
  password: '',
  role_id: null as number | null
})

const editForm = reactive({
  id: null as number | null,
  full_name: '',
  role_id: null as number | null
})

const roleForm = reactive({
  name: '',
  allow_self_register: false
})

const activeRoles = computed(() => roles.value.filter((role) => !role.deleted_at))

async function loadUsers() {
  const { data } = await usersApi.getUsers(filters)
  users.value = data
}

async function loadRoles() {
  if (!canViewRoles.value) return
  const [{ data: roleData }, { data: permissionData }] = await Promise.all([
    usersApi.getRoles({ include_deleted: 1 }),
    usersApi.getPermissions()
  ])
  roles.value = roleData
  allPermissions.value = permissionData
}

async function createUser() {
  if (!createForm.email || !createForm.full_name || !createForm.password || !createForm.role_id) return
  await usersApi.createUser(createForm)
  Object.assign(createForm, { email: '', full_name: '', password: '', role_id: null })
  showCreate.value = false
  await loadUsers()
  ElMessage.success('Пользователь создан')
}

function openEdit(user: User) {
  editForm.id = user.id
  editForm.full_name = user.full_name
  editForm.role_id = user.role_id
  showEdit.value = true
}

async function saveEdit() {
  if (!editForm.id) return
  await usersApi.updateUser(editForm.id, { full_name: editForm.full_name, role_id: editForm.role_id })
  showEdit.value = false
  await loadUsers()
  ElMessage.success('Изменения сохранены')
}

async function deactivate(user: User) {
  await usersApi.deactivateUser(user.id)
  await loadUsers()
  ElMessage.success('Пользователь деактивирован')
}

async function activate(user: User) {
  await usersApi.activateUser(user.id)
  await loadUsers()
  ElMessage.success('Пользователь активирован')
}

async function loadActivity(user: User) {
  const { data } = await usersApi.getUserActivity(user.id)
  activity.value = data
  showActivity.value = true
}

function openCreateRole() {
  editingRoleId.value = null
  roleForm.name = ''
  roleForm.allow_self_register = false
  showRoleForm.value = true
}

function openEditRole(role: any) {
  editingRoleId.value = role.id
  roleForm.name = role.name
  roleForm.allow_self_register = !!role.allow_self_register
  showRoleForm.value = true
}

async function saveRole() {
  const payload = {
    name: roleForm.name,
    allow_self_register: roleForm.allow_self_register ? 1 : 0
  }
  if (editingRoleId.value) {
    await usersApi.updateRole(editingRoleId.value, payload)
    ElMessage.success('Роль обновлена')
  } else {
    await usersApi.createRole(payload)
    ElMessage.success('Роль создана')
  }
  showRoleForm.value = false
  await loadRoles()
}

async function archiveRole(role: any) {
  await usersApi.deactivateRole(role.id)
  await loadRoles()
  ElMessage.success('Роль перемещена в архив')
}

async function restoreRole(role: any) {
  await usersApi.restoreRole(role.id)
  await loadRoles()
  ElMessage.success('Роль восстановлена')
}

async function purgeRole(role: any) {
  await ElMessageBox.confirm(`Удалить роль "${role.name}" безвозвратно?`, 'Подтверждение', { type: 'warning' })
  await usersApi.purgeRole(role.id)
  await loadRoles()
  ElMessage.success('Роль удалена')
}

async function openPermissions(role: any) {
  permissionsRoleId.value = role.id
  const { data } = await usersApi.getRolePermissions(role.id)
  selectedPermissions.value = data.map((item: any) => item.key)
  showPermissions.value = true
}

async function savePermissions() {
  if (!permissionsRoleId.value) return
  await usersApi.setRolePermissions(permissionsRoleId.value, selectedPermissions.value)
  showPermissions.value = false
  ElMessage.success('Права роли обновлены')
}

onMounted(async () => {
  await loadUsers()
  await loadRoles()
})
</script>

