<!-- API 密钥管理页面 -->
<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-show="showSearchBar"
      v-model="searchForm"
      :items="searchItems"
      :show-expand="false"
      :button-left-limit="0"
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card" :class="showSearchBar ? 'mt-3' : 'mt-0'" shadow="never">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:show-search-bar="showSearchBar"
        :loading="loading"
        @refresh="loadTokens"
      >
        <template #right>
          <ElButton type="primary" @click="openCreateDialog"
            ><ArtSvgIcon class="mr-2" icon="ri:add-line" />{{ $t('apiKeys.create') }}</ElButton
          >
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="tokens"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('apiKeys.empty')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #name="{ row }"
          ><div
            ><p class="font-medium text-g-900">{{ row.name }}</p
            ><p class="mt-1 text-xs font-mono text-g-500">{{ row.key }}</p></div
          ></template
        >
        <template #status="{ row }"
          ><ElSwitch
            :model-value="row.status === 1"
            :loading="statusLoadingId === row.id"
            @change="(value) => handleStatusChange(row, Boolean(value))"
        /></template>
        <template #quota="{ row }"
          ><span>{{ formatQuota(row) }}</span></template
        >
        <template #expired_time="{ row }"
          ><span>{{ formatTimestamp(row.expired_time) }}</span></template
        >
        <template #created_time="{ row }"
          ><span>{{ formatTimestamp(row.created_time) }}</span></template
        >
        <template #actions="{ row }">
          <ElButton link type="primary" @click="copyToken(row)">{{ $t('apiKeys.copy') }}</ElButton>
          <ElButton link type="primary" @click="openEditDialog(row)">{{
            $t('apiKeys.edit')
          }}</ElButton>
          <ElButton link type="danger" @click="removeToken(row)">{{
            $t('apiKeys.delete')
          }}</ElButton>
        </template>
      </ArtTable>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="editingToken ? $t('apiKeys.editTitle') : $t('apiKeys.createTitle')"
      width="min(34rem, 92vw)"
      destroy-on-close
    >
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="right"
        label-width="auto"
      >
        <ElFormItem :label="$t('apiKeys.fields.name')" prop="name"
          ><ElInput v-model.trim="formData.name" maxlength="30" show-word-limit
        /></ElFormItem>
        <ElFormItem :label="$t('apiKeys.fields.unlimited')" prop="unlimited_quota">
          <ElSwitch v-model="formData.unlimited_quota" />
        </ElFormItem>
        <ElFormItem
          v-if="!formData.unlimited_quota"
          :label="$t('apiKeys.fields.quota')"
          prop="remain_quota"
          ><ElInputNumber
            v-model="remainingQuotaUsd"
            class="w-full"
            :min="0"
            :precision="4"
            :step="0.0001"
            controls-position="right"
        /></ElFormItem>
        <ElFormItem :label="$t('apiKeys.fields.expiration')"
          ><ElDatePicker
            v-model="expirationDate"
            class="w-full"
            type="datetime"
            :placeholder="$t('apiKeys.neverExpires')"
            clearable
        /></ElFormItem>
        <ElFormItem :label="$t('apiKeys.fields.allowedIps')"
          ><ElInput
            v-model.trim="formData.allow_ips"
            :placeholder="$t('apiKeys.fields.allowedIpsHint')"
        /></ElFormItem>
        <ElFormItem :label="$t('apiKeys.fields.modelLimits')"
          ><ElSelect
            v-model="selectedModels"
            class="w-full"
            multiple
            filterable
            clearable
            collapse-tags
            collapse-tags-tooltip
            :loading="modelsLoading"
            :placeholder="$t('apiKeys.fields.modelLimitsHint')"
          >
            <ElOption v-for="model in modelOptions" :key="model" :label="model" :value="model" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitToken">{{
          $t('common.confirm')
        }}</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    createToken,
    deleteToken,
    fetchTokenKey,
    fetchTokens,
    fetchUserModels,
    updateToken,
    updateTokenStatus,
    type ApiToken,
    type TokenFormData
  } from '@/api/token'
  import { fetchSystemStatus } from '@/api/auth'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import {
    DEFAULT_QUOTA_PER_UNIT,
    formatQuotaUsd,
    quotaToUsd,
    resolveQuotaPerUnit,
    usdToQuota
  } from '@/utils/quota'
  import { useClipboard } from '@vueuse/core'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'ApiKeyList' })

  interface TokenSearchForm {
    keyword: string
    token: string
  }

  const { t } = useI18n()
  const { copy } = useClipboard()
  const loading = ref(false)
  const submitting = ref(false)
  const modelsLoading = ref(false)
  const statusLoadingId = ref<number>()
  const tokens = ref<ApiToken[]>([])
  const modelOptions = ref<string[]>([])
  const showSearchBar = ref(true)
  const initialSearchForm: TokenSearchForm = { keyword: '', token: '' }
  const searchForm = reactive<TokenSearchForm>({ ...initialSearchForm })
  const activeSearchForm = reactive<TokenSearchForm>({ ...initialSearchForm })
  const dialogVisible = ref(false)
  const editingToken = ref<ApiToken>()
  const expirationDate = ref<Date>()
  const formRef = ref<FormInstance>()
  const quotaPerUnit = ref(DEFAULT_QUOTA_PER_UNIT)
  const pagination = reactive({ current: 1, size: 10, total: 0 })
  /**
   * 构建 API 密钥筛选项
   * @returns 筛选表单配置
   */
  const searchItems = computed(() => [
    {
      label: t('apiKeys.filters.name'),
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: t('apiKeys.filters.namePlaceholder') }
    },
    {
      label: t('apiKeys.filters.key'),
      key: 'token',
      type: 'input',
      props: { clearable: true, placeholder: t('apiKeys.filters.keyPlaceholder') }
    }
  ])
  const { columns, columnChecks } = useTableColumns<ApiToken>(() => [
    { prop: 'name', label: t('apiKeys.columns.name'), minWidth: 220, useSlot: true },
    { prop: 'status', label: t('apiKeys.columns.status'), width: 90, useSlot: true },
    { prop: 'quota', label: t('apiKeys.columns.quota'), minWidth: 150, useSlot: true },
    { prop: 'expired_time', label: t('apiKeys.columns.expiration'), minWidth: 165, useSlot: true },
    { prop: 'created_time', label: t('apiKeys.columns.created'), minWidth: 165, useSlot: true },
    {
      prop: 'actions',
      label: t('apiKeys.columns.actions'),
      width: 190,
      fixed: 'right',
      useSlot: true
    }
  ])
  /**
   * 创建 API 密钥表单默认值
   * @returns API 密钥表单默认值
   */
  const createDefaultForm = (): TokenFormData => ({
    name: '',
    remain_quota: 0,
    expired_time: -1,
    unlimited_quota: true,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
    group: '',
    auto_groups: [],
    cross_group_retry: false
  })
  const formData = reactive<TokenFormData>(createDefaultForm())
  /**
   * 在多选数组与接口所需的逗号分隔模型字符串之间转换
   * @returns 当前已选择的模型名称列表
   */
  const selectedModels = computed<string[]>({
    get: () => formData.model_limits.split(',').filter(Boolean),
    set: (models) => {
      formData.model_limits = models.join(',')
      formData.model_limits_enabled = models.length > 0
    }
  })
  /**
   * 在美元输入值与接口 quota 单位之间双向转换
   * @returns 当前剩余额度的美元数值
   */
  const remainingQuotaUsd = computed<number>({
    get: () => quotaToUsd(formData.remain_quota, quotaPerUnit.value),
    set: (amount) => {
      formData.remain_quota = usdToQuota(amount, quotaPerUnit.value)
    }
  })
  const formRules = computed<FormRules<TokenFormData>>(() => ({
    name: [{ required: true, message: t('apiKeys.validation.name'), trigger: 'blur' }]
  }))

  /**
   * 加载当前页 API 密钥
   * @returns 无返回值
   */
  const loadTokens = async (): Promise<void> => {
    loading.value = true
    try {
      const result = await fetchTokens({
        p: pagination.current,
        size: pagination.size,
        keyword: activeSearchForm.keyword || undefined,
        token: activeSearchForm.token || undefined
      })
      tokens.value = result.items || []
      pagination.total = result.total || 0
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化美元换算配置与 API 密钥列表
   * @returns 无返回值
   */
  const initializePage = async (): Promise<void> => {
    const status = await fetchSystemStatus()
    quotaPerUnit.value = resolveQuotaPerUnit(status.quota_per_unit)
    await loadTokens()
  }

  /**
   * 执行关键字搜索并回到第一页
   * @param params 密钥名称与密钥筛选条件
   * @returns 无返回值
   */
  const handleSearch = (params: Record<string, any>): void => {
    Object.assign(activeSearchForm, initialSearchForm, params)
    pagination.current = 1
    loadTokens()
  }

  /**
   * 重置筛选条件并重新加载列表
   * @returns 无返回值
   */
  const handleReset = (): void => {
    Object.assign(activeSearchForm, initialSearchForm)
    pagination.current = 1
    loadTokens()
  }
  /**
   * 修改每页条数并重新加载
   * @param size 每页条数
   * @returns 无返回值
   */
  const handleSizeChange = (size: number): void => {
    pagination.size = size
    pagination.current = 1
    loadTokens()
  }
  /**
   * 修改当前页并重新加载
   * @param page 目标页码
   * @returns 无返回值
   */
  const handleCurrentChange = (page: number): void => {
    pagination.current = page
    loadTokens()
  }

  /**
   * 加载当前用户可选择的模型
   * @returns 无返回值
   */
  const loadModelOptions = async (): Promise<void> => {
    modelsLoading.value = true
    try {
      modelOptions.value = await fetchUserModels()
    } catch {
      modelOptions.value = []
    } finally {
      modelsLoading.value = false
    }
  }

  /**
   * 打开新建密钥对话框
   * @returns 无返回值
   */
  const openCreateDialog = (): void => {
    editingToken.value = undefined
    Object.assign(formData, createDefaultForm())
    expirationDate.value = undefined
    dialogVisible.value = true
    void loadModelOptions()
  }

  /**
   * 打开编辑密钥对话框
   * @param token 待编辑密钥
   * @returns 无返回值
   */
  const openEditDialog = (token: ApiToken): void => {
    editingToken.value = token
    Object.assign(formData, {
      name: token.name,
      remain_quota: token.remain_quota,
      expired_time: token.expired_time,
      unlimited_quota: token.unlimited_quota,
      model_limits_enabled: token.model_limits_enabled,
      model_limits: token.model_limits || '',
      allow_ips: token.allow_ips || '',
      group: token.group || '',
      auto_groups: [],
      cross_group_retry: false
    })
    expirationDate.value = token.expired_time > 0 ? new Date(token.expired_time * 1000) : undefined
    dialogVisible.value = true
    void loadModelOptions()
  }

  /**
   * 校验并保存 API 密钥
   * @returns 无返回值
   */
  const submitToken = async (): Promise<void> => {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
    submitting.value = true
    try {
      formData.expired_time = expirationDate.value
        ? Math.floor(expirationDate.value.getTime() / 1000)
        : -1
      if (editingToken.value) await updateToken({ ...formData, id: editingToken.value.id })
      else await createToken({ ...formData })
      ElMessage.success(t(editingToken.value ? 'apiKeys.updated' : 'apiKeys.created'))
      dialogVisible.value = false
      await loadTokens()
    } finally {
      submitting.value = false
    }
  }

  /**
   * 切换 API 密钥状态
   * @param token 目标密钥
   * @param enabled 是否启用
   * @returns 无返回值
   */
  const handleStatusChange = async (token: ApiToken, enabled: boolean): Promise<void> => {
    statusLoadingId.value = token.id
    try {
      await updateTokenStatus(token.id, enabled ? 1 : 2)
      token.status = enabled ? 1 : 2
      ElMessage.success(t('apiKeys.statusUpdated'))
    } finally {
      statusLoadingId.value = undefined
    }
  }

  /**
   * 获取完整密钥并复制
   * @param token 目标密钥
   * @returns 无返回值
   */
  const copyToken = async (token: ApiToken): Promise<void> => {
    const result = await fetchTokenKey(token.id)
    await copy(result.key)
    ElMessage.success(t('apiKeys.copied'))
  }

  /**
   * 确认后删除 API 密钥
   * @param token 目标密钥
   * @returns 无返回值
   */
  const removeToken = async (token: ApiToken): Promise<void> => {
    await ElMessageBox.confirm(t('apiKeys.deleteConfirm', { name: token.name }), t('common.tips'), {
      type: 'warning'
    })
    await deleteToken(token.id)
    ElMessage.success(t('apiKeys.deleted'))
    await loadTokens()
  }

  /**
   * 格式化密钥额度
   * @param token API 密钥
   * @returns 额度文本
   */
  const formatQuota = (token: ApiToken): string =>
    token.unlimited_quota
      ? t('apiKeys.unlimited')
      : `${formatQuotaUsd(token.remain_quota, quotaPerUnit.value)} / ${formatQuotaUsd(token.used_quota, quotaPerUnit.value)}`

  /**
   * 格式化秒级时间戳
   * @param timestamp 秒级时间戳
   * @returns 本地日期时间
   */
  const formatTimestamp = (timestamp: number): string =>
    timestamp <= 0
      ? t('apiKeys.neverExpires')
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
          timestamp * 1000
        )

  onMounted(initializePage)
</script>
