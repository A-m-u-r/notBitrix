<template>
  <div class="register-page">
    <div class="register-box">
      <div class="register-header">
        <h1>Регистрация</h1>
        <p>Создание учетной записи в AIS</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="submit" label-position="top">
        <el-form-item label="Имя" prop="full_name">
          <el-input v-model="form.full_name" placeholder="Иван Иванов" size="large" />
        </el-form-item>

        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" placeholder="user@slider.ru" size="large" />
        </el-form-item>

        <el-form-item label="Роль" prop="role_name">
          <el-select v-model="form.role_name" style="width: 100%;" size="large">
            <el-option v-for="role in registerRoles" :key="role.name" :label="role.name" :value="role.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="Пароль" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="Минимум 6 символов" size="large" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" size="large" :loading="loading" style="width: 100%;">
            Зарегистрироваться
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

      <div class="register-footer">
        <span>Уже есть аккаунт?</span>
        <el-button link @click="router.push('/login')">Войти</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { getRegisterRoles } from '../../api/auth'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const formRef = ref()
const registerRoles = ref<Array<{ id: number; name: string }>>([])

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  role_name: 'Developer'
})

const rules = {
  full_name: [{ required: true, message: 'Введите имя', trigger: 'blur' }],
  email: [{ required: true, message: 'Введите email', trigger: 'blur' }],
  password: [{ required: true, message: 'Введите пароль', trigger: 'blur' }]
}

onMounted(async () => {
  const { data } = await getRegisterRoles()
  registerRoles.value = data
  if (data.length && !data.find((item: any) => item.name === form.role_name)) {
    form.role_name = data[0].name
  }
})

async function submit() {
  await formRef.value?.validate()
  loading.value = true
  error.value = ''
  try {
    await auth.signUp(form)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Ошибка регистрации'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #001529 0%, #003a70 100%);
}

.register-box {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  width: 460px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.register-header {
  text-align: center;
  margin-bottom: 20px;
}

.register-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: #001529;
}

.register-header p {
  color: #909399;
  margin-top: 6px;
}

.register-footer {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  gap: 8px;
  align-items: center;
}
</style>

