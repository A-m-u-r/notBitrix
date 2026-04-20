<template>
  <el-container class="app-layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="app-aside">
      <AppSidebar :collapsed="collapsed" />
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <button class="toggle-btn" type="button" @click="collapsed = !collapsed" aria-label="Toggle sidebar">
          <el-icon>
            <Fold v-if="!collapsed" /><Expand v-else />
          </el-icon>
        </button>
        <div class="header-right">
          <el-dropdown @command="handleCmd">
            <span class="user-info">
              <el-avatar size="small" :style="{ background: '#409eff' }">
                {{ auth.user?.full_name?.charAt(0) }}
              </el-avatar>
              <span v-if="!collapsed" class="user-name">{{ auth.user?.full_name }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.user?.role_name }}</el-dropdown-item>
                <el-dropdown-item divided command="logout">Выйти</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import AppSidebar from './AppSidebar.vue'

const auth = useAuthStore()
const router = useRouter()
const collapsed = ref(false)

async function handleCmd(cmd: string) {
  if (cmd === 'logout') {
    await auth.signOut()
    router.push('/login')
  }
}
</script>

<style>
.app-layout { height: 100vh; overflow: hidden; }
.app-aside { transition: width 0.2s; overflow: hidden; background: #001529; }
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-bottom: 1px solid #e8e8e8; padding: 0 16px; height: 56px;
}
.toggle-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: #606266;
  font-size: 20px;
}
.toggle-btn:hover { background: #f3f5f7; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.user-name { font-size: 14px; color: #303133; }
.app-main { padding: 20px; background: #f5f5f5; height: calc(100vh - 56px); overflow-y: auto; }
*,
*::before,
*::after { box-sizing: border-box; }
body { margin: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
