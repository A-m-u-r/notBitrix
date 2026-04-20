<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <h1>AIS RM</h1>
        <p>Управление требованиями<br />ООО «Слайдер Презентации»</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="submit" label-position="top">
        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" placeholder="user@slider.ru" :prefix-icon="Message" size="large" />
        </el-form-item>

        <el-form-item label="Пароль" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="••••••" size="large" :prefix-icon="Lock" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" size="large" :loading="loading" style="width: 100%;">
            Войти
          </el-button>
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
      </el-form>

      <div class="register-link">
        <span>Нет аккаунта?</span>
        <el-button link @click="router.push('/register')">Зарегистрироваться</el-button>
      </div>

      <div class="demo-hint">
        <el-divider>Тестовые аккаунты</el-divider>
        <div class="demo-users">
          <el-button v-for="user in demoUsers" :key="user.email" text size="small" @click="fillDemo(user)">
            {{ user.label }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const formRef = ref()

const form = reactive({
  email: '',
  password: ''
})

const rules = {
  email: [{ required: true, message: 'Введите email', trigger: 'blur' }],
  password: [{ required: true, message: 'Введите пароль', trigger: 'blur' }]
}

const demoUsers = [
  { label: 'Admin', email: 'admin@slider.ru', password: 'admin123' },
  { label: 'Director', email: 'director@slider.ru', password: 'pass123' },
  { label: 'TeamLead', email: 'lead@slider.ru', password: 'pass123' },
  { label: 'Developer', email: 'dev1@slider.ru', password: 'pass123' },
  { label: 'Analyst', email: 'analyst@slider.ru', password: 'pass123' },
  { label: 'QA', email: 'qa@slider.ru', password: 'pass123' }
]

function fillDemo(user: { email: string; password: string }) {
  form.email = user.email
  form.password = user.password
}

async function submit() {
  await formRef.value?.validate()
  loading.value = true
  error.value = ''
  try {
    await auth.signIn(form.email, form.password)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Ошибка входа'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001529 0%, #003a70 100%);
}

.login-box {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h1 {
  font-size: 32px;
  font-weight: 800;
  color: #001529;
  margin-bottom: 8px;
}

.login-header p {
  color: #909399;
  font-size: 14px;
  line-height: 1.6;
}

.register-link {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.demo-hint {
  margin-top: 14px;
}

.demo-users {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
</style>
