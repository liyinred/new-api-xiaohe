<!-- 注册页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />
    <div class="relative flex-1">
      <AuthTopBar />
      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('register.title') }}</h3>
          <p class="sub-title">{{ $t('register.subTitle') }}</p>
          <ElAlert
            v-if="registrationDisabled"
            class="mt-6"
            :title="$t('register.disabled')"
            type="warning"
            :closable="false"
          />
          <ElForm
            ref="formRef"
            class="mt-7.5"
            :model="formData"
            :rules="rules"
            label-position="top"
            :validate-on-rule-change="false"
            :key="formKey"
          >
            <ElFormItem prop="username">
              <ElInput
                v-model.trim="formData.username"
                class="custom-height"
                :placeholder="$t('register.placeholder.username')"
                autocomplete="username"
              />
            </ElFormItem>
            <ElFormItem v-if="emailVerification" prop="email">
              <ElInput
                v-model.trim="formData.email"
                class="custom-height"
                :placeholder="$t('register.placeholder.email')"
                autocomplete="email"
              />
            </ElFormItem>
            <ElFormItem v-if="emailVerification" prop="verificationCode">
              <div class="flex w-full gap-3">
                <ElInput
                  v-model.trim="formData.verificationCode"
                  class="custom-height"
                  :placeholder="$t('register.placeholder.verificationCode')"
                />
                <ElButton
                  class="custom-height shrink-0"
                  :disabled="verificationCountdown > 0"
                  :loading="verificationLoading"
                  @click="sendVerificationCode"
                >
                  {{ verificationButtonText }}
                </ElButton>
              </div>
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                v-model="formData.password"
                class="custom-height"
                :placeholder="$t('register.placeholder.password')"
                type="password"
                autocomplete="new-password"
                show-password
              />
            </ElFormItem>
            <ElFormItem prop="confirmPassword">
              <ElInput
                v-model="formData.confirmPassword"
                class="custom-height"
                :placeholder="$t('register.placeholder.confirmPassword')"
                type="password"
                autocomplete="new-password"
                show-password
                @keyup.enter="register"
              />
            </ElFormItem>
            <ElFormItem prop="agreement">
              <ElCheckbox v-model="formData.agreement">{{ $t('register.agreement') }}</ElCheckbox>
            </ElFormItem>
            <ElButton
              class="w-full custom-height mt-3"
              type="primary"
              :disabled="registrationDisabled"
              :loading="loading"
              @click="register"
              v-ripple
            >
              {{ $t('register.submitBtnText') }}
            </ElButton>
            <div class="mt-5 text-sm text-g-600">
              <span>{{ $t('register.hasAccount') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Login' }">{{
                $t('register.toLogin')
              }}</RouterLink>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchEmailVerification, fetchRegister, fetchSystemStatus } from '@/api/auth'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

  defineOptions({ name: 'Register' })

  interface RegisterForm {
    username: string
    email: string
    verificationCode: string
    password: string
    confirmPassword: string
    agreement: boolean
  }

  const USERNAME_MIN_LENGTH = 3
  const USERNAME_MAX_LENGTH = 20
  const PASSWORD_MIN_LENGTH = 6
  const VERIFICATION_SECONDS = 60
  const { t, locale } = useI18n()
  const router = useRouter()
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const verificationLoading = ref(false)
  const verificationCountdown = ref(0)
  const emailVerification = ref(false)
  const registrationDisabled = ref(false)
  const formKey = ref(0)
  let countdownTimer: number | undefined
  const formData = reactive<RegisterForm>({
    username: '',
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
    agreement: false
  })
  const verificationButtonText = computed(() =>
    verificationCountdown.value > 0
      ? `${verificationCountdown.value}s`
      : t('register.sendVerificationCode')
  )

  /**
   * 校验确认密码
   * @param _rule 表单规则
   * @param value 确认密码
   * @param callback 校验回调
   * @returns 无返回值
   */
  const validateConfirmPassword = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ): void => {
    if (!value) callback(new Error(t('register.rule.confirmPasswordRequired')))
    else if (value !== formData.password) callback(new Error(t('register.rule.passwordMismatch')))
    else callback()
  }

  /**
   * 校验是否同意服务条款
   * @param _rule 表单规则
   * @param value 是否同意
   * @param callback 校验回调
   * @returns 无返回值
   */
  const validateAgreement = (
    _rule: unknown,
    value: boolean,
    callback: (error?: Error) => void
  ): void => {
    callback(value ? undefined : new Error(t('register.rule.agreementRequired')))
  }

  const rules = computed<FormRules<RegisterForm>>(() => ({
    username: [
      { required: true, message: t('register.placeholder.username'), trigger: 'blur' },
      {
        min: USERNAME_MIN_LENGTH,
        max: USERNAME_MAX_LENGTH,
        message: t('register.rule.usernameLength'),
        trigger: 'blur'
      }
    ],
    email: [
      {
        required: emailVerification.value,
        type: 'email',
        message: t('register.rule.email'),
        trigger: 'submit'
      }
    ],
    verificationCode: [
      {
        required: emailVerification.value,
        message: t('register.placeholder.verificationCode'),
        trigger: 'blur'
      }
    ],
    password: [
      { required: true, message: t('register.placeholder.password'), trigger: 'blur' },
      { min: PASSWORD_MIN_LENGTH, message: t('register.rule.passwordLength'), trigger: 'blur' }
    ],
    confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
    agreement: [{ validator: validateAgreement, trigger: 'change' }]
  }))

  watch(locale, () => {
    formKey.value++
  })

  /**
   * 加载注册相关系统开关
   * @returns 无返回值
   */
  const loadSystemStatus = async (): Promise<void> => {
    const status = await fetchSystemStatus()
    emailVerification.value = status.email_verification === true
    registrationDisabled.value =
      status.register_enabled === false || status.password_register_enabled === false
  }

  /**
   * 发送邮箱验证码并开始倒计时
   * @returns 无返回值
   */
  const sendVerificationCode = async (): Promise<void> => {
    await formRef.value?.validateField('email')
    verificationLoading.value = true
    try {
      await fetchEmailVerification(formData.email)
      ElMessage.success(t('register.verificationSent'))
      verificationCountdown.value = VERIFICATION_SECONDS
      countdownTimer = window.setInterval(() => {
        verificationCountdown.value--
        if (verificationCountdown.value <= 0 && countdownTimer) window.clearInterval(countdownTimer)
      }, 1000)
    } finally {
      verificationLoading.value = false
    }
  }

  /**
   * 校验表单并注册普通用户
   * @returns 无返回值
   */
  const register = async (): Promise<void> => {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    loading.value = true
    try {
      await fetchRegister({
        username: formData.username,
        password: formData.password,
        email: emailVerification.value ? formData.email : undefined,
        verification_code: emailVerification.value ? formData.verificationCode : undefined
      })
      ElMessage.success(t('register.success'))
      await router.push({ name: 'Login' })
    } finally {
      loading.value = false
    }
  }

  onMounted(loadSystemStatus)
  onBeforeUnmount(() => {
    if (countdownTimer) window.clearInterval(countdownTimer)
  })
</script>

<style scoped>
  @import '../login/style.css';
</style>
