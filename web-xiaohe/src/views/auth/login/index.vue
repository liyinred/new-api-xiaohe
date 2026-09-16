<!-- 登录页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />
    <div class="relative flex-1">
      <AuthTopBar />
      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('login.title') }}</h3>
          <p class="sub-title">{{ $t('login.subTitle') }}</p>
          <ElForm
            ref="formRef"
            class="mt-7.5"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
          >
            <ElFormItem prop="username">
              <ElInput
                v-model.trim="formData.username"
                class="custom-height"
                :placeholder="$t('login.placeholder.username')"
                autocomplete="username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                v-model="formData.password"
                class="custom-height"
                :placeholder="$t('login.placeholder.password')"
                type="password"
                autocomplete="current-password"
                show-password
              />
            </ElFormItem>
            <div class="flex-cb mt-2 text-sm">
              <ElCheckbox v-model="formData.rememberPassword">
                {{ $t('login.rememberPwd') }}
              </ElCheckbox>
              <RouterLink class="text-theme" :to="{ name: 'ForgetPassword' }">
                {{ $t('login.forgetPwd') }}
              </RouterLink>
            </div>
            <ElButton
              class="w-full custom-height mt-7.5"
              type="primary"
              :loading="loading"
              @click="handleSubmit"
              v-ripple
            >
              {{ $t('login.btnText') }}
            </ElButton>
            <div class="mt-5 text-sm text-g-600">
              <span>{{ $t('login.noAccount') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Register' }">
                {{ $t('login.register') }}
              </RouterLink>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchLogin, transformAuthUser } from '@/api/auth'
  import { useUserStore } from '@/store/modules/user'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, ElNotification, type FormInstance, type FormRules } from 'element-plus'

  defineOptions({ name: 'Login' })

  interface LoginForm {
    username: string
    password: string
    rememberPassword: boolean
  }

  const { t, locale } = useI18n()
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const formRef = ref<FormInstance>()
  const formKey = ref(0)
  const loading = ref(false)
  const formData = reactive<LoginForm>({ username: '', password: '', rememberPassword: true })
  const rules = computed<FormRules<LoginForm>>(() => ({
    username: [{ required: true, message: t('login.placeholder.username'), trigger: 'blur' }],
    password: [{ required: true, message: t('login.placeholder.password'), trigger: 'blur' }]
  }))

  watch(locale, () => {
    formKey.value++
  })

  /**
   * 校验表单并登录当前用户
   * @returns 无返回值
   */
  const handleSubmit = async (): Promise<void> => {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    loading.value = true
    try {
      const bundle = await fetchLogin({ username: formData.username, password: formData.password })
      if (!bundle.access_token || !bundle.user) {
        ElMessage.error(t('login.unsupportedVerification'))
        return
      }
      const currentUser = transformAuthUser(bundle.user)
      userStore.setToken(bundle.access_token)
      userStore.setUserInfo(currentUser)
      userStore.setLoginStatus(true)
      userStore.checkAndClearWorktabs()
      showLoginSuccessNotice(currentUser.userName)
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      await router.push(redirect)
    } finally {
      loading.value = false
    }
  }

  /**
   * 显示登录成功通知
   * @param userName 当前登录用户的显示名称
   * @returns 无返回值
   */
  const showLoginSuccessNotice = (userName: string): void => {
    ElNotification({
      title: t('login.success.title'),
      type: 'success',
      duration: 2500,
      message: t('login.success.message', { name: userName })
    })
  }
</script>

<style scoped>
  @import './style.css';
</style>
