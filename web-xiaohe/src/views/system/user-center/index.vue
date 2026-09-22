<!-- 个人资料页面 -->
<template>
  <div v-loading="loading" class="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <section class="art-card overflow-hidden">
      <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <img
          class="size-18 shrink-0 rounded-2xl object-cover"
          src="/user_avatar.png"
          :alt="$t('profile.avatarAlt')"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="truncate text-2xl font-semibold text-g-900">{{ displayName }}</h1>
            <ElTag effect="light">{{ roleLabel }}</ElTag>
          </div>
          <p class="mt-2 truncate text-sm text-g-500">
            @{{ profile?.username || '-' }} · {{ profile?.email || $t('profile.unboundEmail') }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 border-t border-g-300 sm:grid-cols-3">
        <div class="p-5 sm:border-r sm:border-g-300">
          <p class="text-xs text-g-500">{{ $t('profile.stats.balance') }}</p>
          <p class="mt-2 text-xl font-semibold tabular-nums text-g-900">
            {{ formatQuota(profile?.quota) }}
          </p>
        </div>
        <div class="border-t border-g-300 p-5 sm:border-r sm:border-t-0">
          <p class="text-xs text-g-500">{{ $t('profile.stats.used') }}</p>
          <p class="mt-2 text-xl font-semibold tabular-nums text-g-900">
            {{ formatQuota(profile?.used_quota) }}
          </p>
        </div>
        <div class="border-t border-g-300 p-5 sm:border-t-0">
          <p class="text-xs text-g-500">{{ $t('profile.stats.requests') }}</p>
          <p class="mt-2 text-xl font-semibold tabular-nums text-g-900">
            {{ formatNumber(profile?.request_count) }}
          </p>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-stretch">
      <ElCard class="art-card" shadow="never">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="size-9 flex-cc rounded-lg bg-theme text-white">
              <ArtSvgIcon icon="ri:user-settings-line" />
            </div>
            <div>
              <h2 class="font-semibold text-g-900">{{ $t('profile.userInfo.title') }}</h2>
              <p class="mt-1 text-xs text-g-500">{{ $t('profile.userInfo.description') }}</p>
            </div>
          </div>
        </template>

        <ElForm
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-position="top"
        >
          <ElFormItem :label="$t('profile.userInfo.displayName')" prop="displayName">
            <ElInput
              v-model.trim="profileForm.displayName"
              maxlength="30"
              show-word-limit
              :placeholder="$t('profile.userInfo.displayNamePlaceholder')"
            />
          </ElFormItem>
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <ElFormItem :label="$t('profile.userInfo.group')">
              <ElInput :model-value="profile?.group || $t('profile.defaultGroup')" disabled />
            </ElFormItem>
            <ElFormItem :label="$t('profile.userInfo.accountEmail')">
              <ElInput :model-value="profile?.email || $t('profile.unboundEmail')" disabled />
            </ElFormItem>
          </div>
          <div class="flex justify-end">
            <ElButton type="primary" :loading="profileSaving" @click="saveProfile">
              {{ $t('profile.userInfo.save') }}
            </ElButton>
          </div>
        </ElForm>
      </ElCard>

      <ElCard class="art-card" shadow="never">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="size-9 flex-cc rounded-lg bg-success text-white">
              <ArtSvgIcon icon="ri:mail-settings-line" />
            </div>
            <div>
              <h2 class="font-semibold text-g-900">{{ $t('profile.email.title') }}</h2>
              <p class="mt-1 text-xs text-g-500">{{ $t('profile.email.description') }}</p>
            </div>
          </div>
        </template>

        <ElAlert
          class="mb-5"
          :title="$t('profile.email.accountHint', { email: profile?.email || '-' })"
          type="info"
          :closable="false"
          show-icon
        />
        <ElForm ref="emailFormRef" :model="emailForm" :rules="emailRules" label-position="top">
          <ElFormItem :label="$t('profile.email.notificationEmail')" prop="notificationEmail">
            <ElInput
              v-model.trim="emailForm.notificationEmail"
              type="email"
              :placeholder="$t('profile.email.notificationEmailPlaceholder')"
            />
            <p class="mt-1 text-xs text-g-500">{{ $t('profile.email.notificationEmailHint') }}</p>
          </ElFormItem>
          <ElFormItem :label="$t('profile.email.threshold')" prop="quotaWarningAmount">
            <div class="w-full">
              <ElInputNumber
                v-model="emailForm.quotaWarningAmount"
                class="w-full"
                :min="quotaInputStep"
                :precision="quotaInputPrecision"
                :step="quotaInputStep"
                controls-position="right"
              >
                <template v-if="quotaDisplayPrefix" #prefix>{{ quotaDisplayPrefix }}</template>
                <template v-if="isTokenDisplay" #suffix>Tokens</template>
              </ElInputNumber>
              <p class="mt-1 text-xs text-g-500">{{
                $t('profile.email.thresholdHint', { currency: quotaDisplayName })
              }}</p>
            </div>
          </ElFormItem>
          <div class="flex justify-end">
            <ElButton type="primary" :loading="emailSaving" @click="saveEmailSettings">
              {{ $t('profile.email.save') }}
            </ElButton>
          </div>
        </ElForm>
      </ElCard>
    </div>

    <ElCard class="art-card" shadow="never">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="size-9 flex-cc rounded-lg bg-warning text-white">
            <ArtSvgIcon icon="ri:shield-keyhole-line" />
          </div>
          <div>
            <h2 class="font-semibold text-g-900">{{ $t('profile.security.title') }}</h2>
            <p class="mt-1 text-xs text-g-500">{{ $t('profile.security.description') }}</p>
          </div>
        </div>
      </template>

      <div class="flex flex-col gap-3">
        <div
          class="flex flex-col gap-3 rounded-lg border border-g-300 p-3 sm:flex-row sm:items-center"
        >
          <div class="size-9 flex-cc shrink-0 rounded-lg bg-g-100 text-g-700">
            <ArtSvgIcon icon="ri:lock-password-line" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-g-900">{{ $t('profile.security.password') }}</p>
              <ElTag size="small" :type="profile?.has_password === false ? 'info' : 'success'">
                {{
                  $t(
                    profile?.has_password === false
                      ? 'profile.security.notConfigured'
                      : 'profile.security.configured'
                  )
                }}
              </ElTag>
            </div>
            <p class="mt-1 text-xs text-g-500">{{ $t('profile.security.passwordHint') }}</p>
          </div>
          <ElButton
            :disabled="profile?.has_password === false"
            @click="passwordDialogVisible = true"
          >
            {{ $t('profile.security.changePassword') }}
          </ElButton>
        </div>

        <div
          class="flex flex-col gap-3 rounded-lg border border-g-300 p-3 sm:flex-row sm:items-center"
        >
          <div class="size-9 flex-cc shrink-0 rounded-lg bg-g-100 text-g-700">
            <ArtSvgIcon icon="ri:mail-check-line" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-g-900">{{
                $t('profile.security.accountEmail')
              }}</p>
              <ElTag size="small" :type="profile?.email ? 'success' : 'info'">
                {{ $t(profile?.email ? 'profile.security.bound' : 'profile.security.notBound') }}
              </ElTag>
            </div>
            <p class="mt-1 truncate text-xs text-g-500">
              {{ profile?.email || $t('profile.security.emailHint') }}
            </p>
          </div>
          <ElButton @click="emailBindingDialogVisible = true">
            {{ $t(profile?.email ? 'profile.security.changeEmail' : 'profile.security.bindEmail') }}
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElDialog
      v-model="passwordDialogVisible"
      :title="$t('profile.security.changePassword')"
      width="min(28rem, 92vw)"
      destroy-on-close
      @closed="resetPasswordForm"
    >
      <ElForm
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
      >
        <ElFormItem :label="$t('profile.security.currentPassword')" prop="currentPassword">
          <ElInput
            v-model="passwordForm.currentPassword"
            type="password"
            autocomplete="current-password"
            show-password
          />
        </ElFormItem>
        <ElFormItem :label="$t('profile.security.newPassword')" prop="newPassword">
          <ElInput
            v-model="passwordForm.newPassword"
            type="password"
            autocomplete="new-password"
            show-password
          />
          <p class="mt-1 w-full text-xs text-g-500">{{ $t('profile.security.passwordPolicy') }}</p>
        </ElFormItem>
        <ElFormItem :label="$t('profile.security.confirmPassword')" prop="confirmPassword">
          <ElInput
            v-model="passwordForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            show-password
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="passwordDialogVisible = false">{{
          $t('profile.security.cancel')
        }}</ElButton>
        <ElButton type="primary" :loading="passwordSaving" @click="savePassword">
          {{ $t('profile.security.changePassword') }}
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="emailBindingDialogVisible"
      :title="$t(profile?.email ? 'profile.security.changeEmail' : 'profile.security.bindEmail')"
      width="min(28rem, 92vw)"
      destroy-on-close
      @closed="resetEmailBindingForm"
    >
      <ElForm
        ref="emailBindingFormRef"
        :model="emailBindingForm"
        :rules="emailBindingRules"
        label-position="top"
      >
        <template v-if="!emailBindingFlow">
          <ElFormItem :label="$t('profile.security.newAccountEmail')" prop="email">
            <ElInput v-model.trim="emailBindingForm.email" type="email" autocomplete="email" />
          </ElFormItem>
          <ElFormItem :label="$t('profile.security.currentPassword')" prop="password">
            <ElInput
              v-model="emailBindingForm.password"
              type="password"
              autocomplete="current-password"
              show-password
            />
          </ElFormItem>
        </template>
        <template v-else>
          <ElAlert
            class="mb-4"
            :title="$t('profile.security.emailCodeHint', { email: emailBindingFlow.email })"
            type="info"
            :closable="false"
            show-icon
          />
          <ElFormItem :label="$t('profile.security.newEmailCode')" prop="newCode">
            <ElInput
              v-model.trim="emailBindingForm.newCode"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
            />
          </ElFormItem>
          <ElFormItem
            v-if="emailBindingFlow.old_email_required"
            :label="$t('profile.security.oldEmailCode')"
            prop="oldCode"
          >
            <ElInput
              v-model.trim="emailBindingForm.oldCode"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
            />
          </ElFormItem>
          <ElButton
            link
            type="primary"
            :disabled="emailResendSeconds > 0"
            :loading="emailBindingSaving"
            @click="resendEmailCode"
          >
            {{
              emailResendSeconds > 0
                ? $t('profile.security.resendCountdown', { seconds: emailResendSeconds })
                : $t('profile.security.resendCode')
            }}
          </ElButton>
        </template>
      </ElForm>
      <template #footer>
        <ElButton @click="emailBindingDialogVisible = false">{{
          $t('profile.security.cancel')
        }}</ElButton>
        <ElButton type="primary" :loading="emailBindingSaving" @click="submitEmailBinding">
          {{ $t(emailBindingFlow ? 'profile.security.confirmEmail' : 'profile.security.continue') }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    changeAccountPassword,
    confirmEmailBinding,
    fetchUserProfile,
    parseUserSettings,
    requestPasswordSecurityProof,
    resendEmailBinding,
    startEmailBinding,
    updateUserProfile,
    updateUserSettings,
    type EmailBindingFlow,
    type UserProfile,
    type UserSettings
  } from '@/api/profile'
  import { fetchSystemStatus, transformAuthUser, type SystemStatus } from '@/api/auth'
  import { useUserStore } from '@/store/modules/user'
  import {
    displayAmountToQuota,
    formatQuota as formatDisplayQuota,
    getQuotaDisplayPrefix,
    quotaToDisplayAmount
  } from '@/utils/quota'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'UserCenter' })

  interface ProfileForm {
    displayName: string
  }

  interface EmailForm {
    notificationEmail: string
    quotaWarningAmount: number
  }

  interface PasswordForm {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }

  interface EmailBindingForm {
    email: string
    password: string
    newCode: string
    oldCode: string
  }

  const { t } = useI18n()
  const userStore = useUserStore()
  const loading = ref(false)
  const profileSaving = ref(false)
  const emailSaving = ref(false)
  const passwordSaving = ref(false)
  const emailBindingSaving = ref(false)
  const passwordDialogVisible = ref(false)
  const emailBindingDialogVisible = ref(false)
  const emailBindingFlow = ref<EmailBindingFlow>()
  const currentTime = useNow({ interval: 1000 })
  const profile = ref<UserProfile>()
  const settings = ref<UserSettings>(parseUserSettings())
  const profileFormRef = ref<FormInstance>()
  const emailFormRef = ref<FormInstance>()
  const passwordFormRef = ref<FormInstance>()
  const emailBindingFormRef = ref<FormInstance>()
  const systemStatus = ref<SystemStatus>()
  const profileForm = reactive<ProfileForm>({ displayName: '' })
  const emailForm = reactive<EmailForm>({
    notificationEmail: '',
    quotaWarningAmount: 1
  })
  const passwordForm = reactive<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const emailBindingForm = reactive<EmailBindingForm>({
    email: '',
    password: '',
    newCode: '',
    oldCode: ''
  })
  /**
   * 计算邮箱验证码可重新发送前的剩余秒数
   * @returns 剩余秒数
   */
  const emailResendSeconds = computed(() =>
    Math.max(
      0,
      Math.ceil((emailBindingFlow.value?.resend_at || 0) - currentTime.value.getTime() / 1000)
    )
  )
  /**
   * 获取用于页面展示的用户名称
   * @returns 显示名称或用户名
   */
  const displayName = computed(() => profile.value?.display_name || profile.value?.username || '-')
  /**
   * 获取本地化用户角色名称
   * @returns 用户角色文本
   */
  const roleLabel = computed(() => {
    if (profile.value?.role === 100) return t('profile.roles.super')
    if (profile.value?.role === 10) return t('profile.roles.admin')
    return t('profile.roles.user')
  })
  /**
   * 判断额度是否按 Tokens 展示
   * @returns 是否使用 Tokens 展示
   */
  const isTokenDisplay = computed(() => systemStatus.value?.quota_display_type === 'TOKENS')
  /**
   * 获取额度输入框使用的币种前缀
   * @returns 当前币种符号，Tokens 模式返回空文本
   */
  const quotaDisplayPrefix = computed(() => getQuotaDisplayPrefix(systemStatus.value).trim())
  /**
   * 获取额度提示使用的展示格式名称
   * @returns 当前货币或 Tokens 格式名称
   */
  const quotaDisplayName = computed(() => {
    if (isTokenDisplay.value) return 'Tokens'
    if (systemStatus.value?.quota_display_type === 'CNY') return 'CNY (¥)'
    if (systemStatus.value?.quota_display_type === 'CUSTOM') {
      return systemStatus.value.custom_currency_symbol?.trim() || '¤'
    }
    return 'USD ($)'
  })
  /**
   * 获取额度输入框的小数精度
   * @returns Tokens 模式为 0，货币模式为 4
   */
  const quotaInputPrecision = computed(() => (isTokenDisplay.value ? 0 : 4))
  /**
   * 获取额度输入框的最小值与步长
   * @returns Tokens 模式为 1，货币模式为 0.0001
   */
  const quotaInputStep = computed(() => (isTokenDisplay.value ? 1 : 0.0001))
  /**
   * 构建用户信息表单校验规则
   * @returns 用户信息表单规则
   */
  const profileRules = computed<FormRules<ProfileForm>>(() => ({
    displayName: [
      { required: true, message: t('profile.validation.displayNameRequired'), trigger: 'blur' },
      { min: 1, max: 30, message: t('profile.validation.displayNameLength'), trigger: 'blur' }
    ]
  }))
  /**
   * 构建邮箱设置表单校验规则
   * @returns 邮箱设置表单规则
   */
  const emailRules = computed<FormRules<EmailForm>>(() => ({
    notificationEmail: [
      { type: 'email', message: t('profile.validation.email'), trigger: ['blur', 'change'] }
    ],
    quotaWarningAmount: [
      { required: true, message: t('profile.validation.threshold'), trigger: 'change' }
    ]
  }))

  /**
   * 校验确认密码是否与新密码一致
   * @param _rule Element Plus 校验规则
   * @param value 确认密码
   * @param callback 校验完成回调
   * @returns 无返回值
   */
  const validatePasswordConfirmation = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ): void => {
    if (value !== passwordForm.newPassword) {
      callback(new Error(t('profile.validation.passwordMismatch')))
      return
    }
    callback()
  }

  /**
   * 按 Unicode 字符数校验新密码长度
   * @param _rule Element Plus 校验规则
   * @param value 新密码
   * @param callback 校验完成回调
   * @returns 无返回值
   */
  const validateNewPasswordLength = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ): void => {
    const length = [...value].length
    if (length < 8 || length > 128) {
      callback(new Error(t('profile.validation.passwordLength')))
      return
    }
    callback()
  }

  /**
   * 构建密码修改表单校验规则
   * @returns 密码修改表单规则
   */
  const passwordRules = computed<FormRules<PasswordForm>>(() => ({
    currentPassword: [
      { required: true, message: t('profile.validation.currentPassword'), trigger: 'blur' }
    ],
    newPassword: [
      { required: true, message: t('profile.validation.newPassword'), trigger: 'blur' },
      { validator: validateNewPasswordLength, trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: t('profile.validation.confirmPassword'), trigger: 'blur' },
      { validator: validatePasswordConfirmation, trigger: 'blur' }
    ]
  }))

  /**
   * 构建账户邮箱绑定表单校验规则
   * @returns 账户邮箱绑定表单规则
   */
  const emailBindingRules = computed<FormRules<EmailBindingForm>>(() => ({
    email: [
      { required: true, message: t('profile.validation.accountEmail'), trigger: 'blur' },
      { type: 'email', message: t('profile.validation.email'), trigger: 'blur' },
      { max: 50, message: t('profile.validation.email'), trigger: 'blur' }
    ],
    password: [
      { required: true, message: t('profile.validation.currentPassword'), trigger: 'blur' }
    ]
  }))

  /**
   * 将资料与设置同步到页面表单
   * @param nextProfile 最新用户资料
   * @returns 无返回值
   */
  const syncForms = (nextProfile: UserProfile): void => {
    const nextSettings = parseUserSettings(nextProfile.setting)
    profileForm.displayName = nextProfile.display_name || nextProfile.username
    emailForm.notificationEmail = nextSettings.notification_email
    emailForm.quotaWarningAmount = quotaToDisplayAmount(
      nextSettings.quota_warning_threshold,
      systemStatus.value
    )
    settings.value = nextSettings
  }

  /**
   * 加载当前用户资料并同步登录用户状态
   * @returns 无返回值
   */
  const loadProfile = async (): Promise<void> => {
    loading.value = true
    try {
      const [result, status] = await Promise.all([fetchUserProfile(), fetchSystemStatus()])
      systemStatus.value = status
      profile.value = result
      syncForms(result)
      userStore.setUserInfo(transformAuthUser(result))
    } finally {
      loading.value = false
    }
  }

  /**
   * 校验并保存用户显示名称
   * @returns 无返回值
   */
  const saveProfile = async (): Promise<void> => {
    if (!profileFormRef.value) return
    const valid = await profileFormRef.value.validate().catch(() => false)
    if (!valid) return

    profileSaving.value = true
    try {
      await updateUserProfile(profileForm.displayName)
      ElMessage.success(t('profile.userInfo.saved'))
      await loadProfile()
    } finally {
      profileSaving.value = false
    }
  }

  /**
   * 校验并保存邮箱通知设置
   * @returns 无返回值
   */
  const saveEmailSettings = async (): Promise<void> => {
    if (!emailFormRef.value) return
    const valid = await emailFormRef.value.validate().catch(() => false)
    if (!valid) return

    emailSaving.value = true
    try {
      await updateUserSettings({
        ...settings.value,
        notify_type: 'email',
        notification_email: emailForm.notificationEmail,
        quota_warning_threshold: displayAmountToQuota(
          emailForm.quotaWarningAmount,
          systemStatus.value
        )
      })
      ElMessage.success(t('profile.email.saved'))
      await loadProfile()
    } finally {
      emailSaving.value = false
    }
  }

  /**
   * 清空密码修改表单及校验状态
   * @returns 无返回值
   */
  const resetPasswordForm = (): void => {
    Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
    passwordFormRef.value?.clearValidate()
  }

  /**
   * 校验安全 proof 并修改当前账户密码
   * @returns 无返回值
   */
  const savePassword = async (): Promise<void> => {
    if (!passwordFormRef.value) return
    const valid = await passwordFormRef.value.validate().catch(() => false)
    if (!valid) return
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      ElMessage.warning(t('profile.validation.passwordUnchanged'))
      return
    }

    passwordSaving.value = true
    try {
      const proof = await requestPasswordSecurityProof(
        'account.password.change',
        passwordForm.currentPassword
      )
      const result = await changeAccountPassword(
        passwordForm.newPassword,
        passwordForm.currentPassword,
        proof.proof_token
      )
      if (result.access_token) userStore.setToken(result.access_token)
      if (result.notification_warning) {
        ElMessage.warning(t('profile.security.notificationWarning'))
      }
      ElMessage.success(t('profile.security.passwordChanged'))
      passwordDialogVisible.value = false
      await loadProfile()
    } finally {
      passwordSaving.value = false
    }
  }

  /**
   * 清空账户邮箱绑定表单及流程状态
   * @returns 无返回值
   */
  const resetEmailBindingForm = (): void => {
    Object.assign(emailBindingForm, { email: '', password: '', newCode: '', oldCode: '' })
    emailBindingFlow.value = undefined
    emailBindingFormRef.value?.clearValidate()
  }

  /**
   * 启动邮箱绑定流程或提交验证码完成绑定
   * @returns 无返回值
   */
  const submitEmailBinding = async (): Promise<void> => {
    if (!emailBindingFlow.value) {
      if (!emailBindingFormRef.value) return
      const valid = await emailBindingFormRef.value.validate().catch(() => false)
      if (!valid) return

      emailBindingSaving.value = true
      try {
        const email = emailBindingForm.email.trim().toLowerCase()
        const proof = await requestPasswordSecurityProof(
          'account.binding.bind',
          emailBindingForm.password,
          { provider: 'email', email }
        )
        const flow = await startEmailBinding(email, proof.proof_token)
        emailBindingFlow.value = flow
        emailBindingForm.password = ''
        if (flow.notification_warning) {
          ElMessage.warning(t('profile.security.notificationWarning'))
        }
      } finally {
        emailBindingSaving.value = false
      }
      return
    }

    if (!/^\d{6}$/.test(emailBindingForm.newCode)) {
      ElMessage.warning(t('profile.validation.emailCode'))
      return
    }
    if (emailBindingFlow.value.old_email_required && !/^\d{6}$/.test(emailBindingForm.oldCode)) {
      ElMessage.warning(t('profile.validation.emailCode'))
      return
    }

    emailBindingSaving.value = true
    try {
      const result = await confirmEmailBinding(
        emailBindingFlow.value.flow_token,
        emailBindingForm.newCode,
        emailBindingForm.oldCode
      )
      if (result.notification_warning) {
        ElMessage.warning(t('profile.security.notificationWarning'))
      }
      ElMessage.success(t('profile.security.emailBound'))
      emailBindingDialogVisible.value = false
      await loadProfile()
    } finally {
      emailBindingSaving.value = false
    }
  }

  /**
   * 重新发送账户邮箱绑定验证码
   * @returns 无返回值
   */
  const resendEmailCode = async (): Promise<void> => {
    if (!emailBindingFlow.value || emailResendSeconds.value > 0) return
    emailBindingSaving.value = true
    try {
      const flow = await resendEmailBinding(emailBindingFlow.value.flow_token)
      emailBindingFlow.value = flow
      if (flow.notification_warning) {
        ElMessage.warning(t('profile.security.notificationWarning'))
      }
      ElMessage.success(t('profile.security.codeResent'))
    } finally {
      emailBindingSaving.value = false
    }
  }

  /**
   * 格式化普通数值
   * @param value 待格式化数值
   * @returns 本地化数值文本
   */
  const formatNumber = (value?: number): string => new Intl.NumberFormat().format(value || 0)

  /**
   * 按管理员设置格式化内部 quota
   * @param quota 内部 quota 数值
   * @returns 展示额度文本
   */
  const formatQuota = (quota?: number): string => formatDisplayQuota(quota || 0, systemStatus.value)

  onMounted(loadProfile)
</script>
