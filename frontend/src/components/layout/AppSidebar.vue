<template>
  <div class="sidebar">
    <div class="logo">
      <span v-if="!collapsed" class="logo-text">AIS RM</span>
      <span v-else class="logo-icon">AIS</span>
    </div>

    <el-menu
      :collapse="collapsed"
      :default-active="route.path"
      router
      background-color="#001529"
      text-color="#ffffffa6"
      active-text-color="#fff"
    >
      <el-menu-item index="/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <template #title>Dashboard</template>
      </el-menu-item>

      <el-menu-item index="/projects">
        <el-icon><Grid /></el-icon>
        <template #title>Projects</template>
      </el-menu-item>

      <el-sub-menu v-if="currentProject" index="project">
        <template #title>
          <el-icon><Document /></el-icon>
          <span class="project-title" :title="currentProject">{{ currentProject }}</span>
        </template>

        <el-menu-item :index="`/projects/${pid}/requirements`">
          <el-icon><List /></el-icon>
          Requirements
        </el-menu-item>

        <el-menu-item :index="`/projects/${pid}/tasks`">
          <el-icon><Tickets /></el-icon>
          Tasks
        </el-menu-item>

        <el-menu-item :index="`/projects/${pid}/bugs`">
          <el-icon><Warning /></el-icon>
          Bugs
        </el-menu-item>

        <el-menu-item :index="`/projects/${pid}/documents`">
          <el-icon><Folder /></el-icon>
          Documents
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item v-if="auth.canPermission('users.view', 'roles.view')" index="/team">
        <el-icon><User /></el-icon>
        <template #title>Team</template>
      </el-menu-item>

      <el-menu-item v-if="auth.canPermission('roles.view', 'users.view')" index="/admin">
        <el-icon><Setting /></el-icon>
        <template #title>Admin</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '../../stores/project.store'
import { useAuthStore } from '../../stores/auth.store'

defineProps<{ collapsed: boolean }>()

const route = useRoute()
const projectStore = useProjectStore()
const auth = useAuthStore()

const pid = computed(() => route.params.id as string)
const currentProject = computed(() => projectStore.current?.name)
</script>

<style scoped>
.sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #002140;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 12px;
}

.el-menu {
  border-right: none;
  flex: 1;
}

.project-title {
  display: inline-block;
  max-width: 128px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
