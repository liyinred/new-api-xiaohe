<!-- 普通用户使用日志页面 -->
<template>
  <div class="art-full-height">
    <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-3">
      <ArtStatsCard
        icon="ri:wallet-3-line"
        icon-style="bg-theme"
        :title="$t('usageLogs.stats.quota')"
        :display-value="formatQuota(stats.quota)"
        :description="$t('usageLogs.stats.quotaHint')"
      />
      <ArtStatsCard
        icon="ri:speed-up-line"
        icon-style="bg-success"
        :title="$t('usageLogs.stats.rpm')"
        :display-value="formatNumber(stats.rpm)"
        :description="$t('usageLogs.stats.rpmHint')"
      />
      <ArtStatsCard
        icon="ri:flashlight-line"
        icon-style="bg-warning"
        :title="$t('usageLogs.stats.tpm')"
        :display-value="formatNumber(stats.tpm)"
        :description="$t('usageLogs.stats.tpmHint')"
      />
    </div>

    <ArtSearchBar
      v-show="showSearchBar"
      v-model="searchForm"
      :items="searchItems"
      :button-left-limit="0"
      default-expanded
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card" :class="showSearchBar ? 'mt-3' : 'mt-0'" shadow="never">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:show-search-bar="showSearchBar"
        :loading="loading"
        @refresh="loadUsageData"
      />

      <ArtTable
        :loading="loading"
        :data="logs"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('usageLogs.empty')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #created_at="{ row }">
          <span class="whitespace-nowrap">{{ formatTimestamp(row.created_at) }}</span>
        </template>
        <template #type="{ row }">
          <ElTag :type="getLogType(row.type).tagType" effect="light">
            {{ $t(getLogType(row.type).label) }}
          </ElTag>
        </template>
        <template #model_name="{ row }">
          <div class="min-w-0">
            <p class="font-medium text-g-900 truncate">{{ row.model_name || '-' }}</p>
            <p v-if="row.group" class="mt-1 text-xs text-g-500 truncate">{{ row.group }}</p>
          </div>
        </template>
        <template #token_name="{ row }">
          <span class="font-mono text-xs text-g-700">{{ row.token_name || '-' }}</span>
        </template>
        <template #tokens="{ row }">
          <div class="font-mono text-xs tabular-nums">
            <span>{{ formatNumber(row.prompt_tokens) }}</span>
            <span class="mx-1 text-g-400">/</span>
            <span>{{ formatNumber(row.completion_tokens) }}</span>
          </div>
        </template>
        <template #quota="{ row }">
          <span class="font-mono tabular-nums">{{ formatQuota(row.quota) }}</span>
        </template>
        <template #use_time="{ row }">
          <div class="text-sm tabular-nums">
            <p>{{ formatDuration(row.use_time) }}</p>
            <p class="mt-1 text-xs text-g-500">
              {{ row.is_stream ? $t('usageLogs.stream') : $t('usageLogs.nonStream') }}
            </p>
          </div>
        </template>
        <template #content="{ row }">
          <ElButton link type="primary" @click="openDetails(row)">
            {{ $t('usageLogs.viewDetails') }}
          </ElButton>
        </template>
      </ArtTable>
    </ElCard>

    <ElDialog
      v-model="detailsVisible"
      :title="$t('usageLogs.details.title')"
      width="min(42rem, 92vw)"
      destroy-on-close
    >
      <div v-if="selectedLog" class="flex flex-col gap-4">
        <div class="rounded-lg bg-g-100 p-3">
          <p class="text-xs text-g-500">{{ $t('usageLogs.details.requestId') }}</p>
          <p class="mt-1 break-all font-mono text-sm text-g-800">
            {{ selectedLog.request_id || '-' }}
          </p>
        </div>
        <div v-if="billingDetails.length">
          <p class="mb-2 text-sm font-medium text-g-800">
            {{ $t('usageLogs.details.billing.title') }}
          </p>
          <div class="overflow-hidden rounded-lg bg-g-100 px-3">
            <div
              v-for="item in billingDetails"
              :key="item.label"
              class="flex items-start justify-between gap-4 border-b border-g-300 py-2.5 last:border-b-0"
            >
              <span class="text-xs text-g-500">{{ item.label }}</span>
              <span class="text-right font-mono text-xs tabular-nums text-g-800">
                {{ item.value }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="quotaAdjustmentDetails.length">
          <p class="mb-2 text-sm font-medium text-g-800">
            {{ $t('usageLogs.details.quotaAdjustment.title') }}
          </p>
          <div class="overflow-hidden rounded-lg bg-g-100 px-3">
            <div
              v-for="item in quotaAdjustmentDetails"
              :key="item.label"
              class="flex items-start justify-between gap-4 border-b border-g-300 py-2.5 last:border-b-0"
            >
              <span class="text-xs text-g-500">{{ item.label }}</span>
              <span class="text-right font-mono text-xs tabular-nums text-g-800">
                {{ item.value }}
              </span>
            </div>
          </div>
        </div>
        <div>
          <p class="mb-2 text-sm font-medium text-g-800">{{ $t('usageLogs.details.content') }}</p>
          <pre
            class="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-g-100 p-3 text-xs leading-6 text-g-800"
            >{{ selectedLog.content || '-' }}</pre
          >
        </div>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchUsageLogs,
    fetchUsageLogStats,
    type UsageLog,
    type UsageLogQuery,
    type UsageLogStats
  } from '@/api/usage-log'
  import { fetchSystemStatus } from '@/api/auth'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import {
    DEFAULT_QUOTA_PER_UNIT,
    formatBillingUsd,
    formatLogQuotaUsd,
    resolveQuotaPerUnit
  } from '@/utils/quota'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'UsageLogs' })

  interface UsageLogSearchForm {
    type?: number
    model_name: string
    token_name: string
    request_id: string
    dateRange: [Date, Date] | null
  }

  interface LogTypeConfig {
    label: string
    tagType: 'primary' | 'success' | 'warning' | 'info' | 'danger'
  }

  interface UsageLogMetadata {
    billing_mode?: string
    matched_tier?: string
    model_price?: number
    model_ratio?: number
    completion_ratio?: number
    group_ratio?: number
    user_group_ratio?: number
    usage_facts?: Record<string, string | number>
    op?: {
      action?: string
      params?: Record<string, unknown>
    }
  }

  interface BillingDetailItem {
    label: string
    value: string
  }

  const { t } = useI18n()
  const loading = ref(false)
  const logs = ref<UsageLog[]>([])
  const stats = reactive<UsageLogStats>({ quota: 0, rpm: 0, tpm: 0 })
  const showSearchBar = ref(true)
  const detailsVisible = ref(false)
  const selectedLog = ref<UsageLog>()
  const quotaPerUnit = ref(DEFAULT_QUOTA_PER_UNIT)
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  /**
   * 创建本地时区的当天起止时间范围
   * @returns 当天 00:00:00.000 至 23:59:59.999
   */
  const createTodayRange = (): [Date, Date] => {
    const start = new Date()
    const end = new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return [start, end]
  }

  const initialSearchForm: UsageLogSearchForm = {
    type: undefined,
    model_name: '',
    token_name: '',
    request_id: '',
    dateRange: createTodayRange()
  }
  const searchForm = reactive<UsageLogSearchForm>({ ...initialSearchForm })
  const activeSearchForm = reactive<UsageLogSearchForm>({ ...initialSearchForm })

  /**
   * 构建当前消费日志的计费详情
   * @returns 计费详情展示项
   */
  const billingDetails = computed<BillingDetailItem[]>(() => {
    const log = selectedLog.value
    if (!log || log.type !== 2) return []
    return buildBillingDetails(log)
  })

  /**
   * 构建当前充值日志的额度调整详情
   * @returns 额度调整详情展示项
   */
  const quotaAdjustmentDetails = computed<BillingDetailItem[]>(() => {
    const log = selectedLog.value
    if (!log || log.type !== 1) return []
    return buildQuotaAdjustmentDetails(log)
  })

  /**
   * 构建日志类型下拉选项
   * @returns 本地化日志类型选项
   */
  const logTypeOptions = computed(() => [
    { value: 0, label: t('usageLogs.types.all') },
    { value: 1, label: t('usageLogs.types.topup') },
    { value: 2, label: t('usageLogs.types.consume') },
    { value: 3, label: t('usageLogs.types.manage') },
    { value: 4, label: t('usageLogs.types.system') },
    { value: 5, label: t('usageLogs.types.error') },
    { value: 6, label: t('usageLogs.types.refund') },
    { value: 7, label: t('usageLogs.types.login') }
  ])

  /**
   * 构建使用日志筛选项
   * @returns 筛选表单配置
   */
  const searchItems = computed(() => [
    {
      label: t('usageLogs.filters.type'),
      key: 'type',
      type: 'select',
      props: {
        clearable: true,
        options: logTypeOptions.value,
        placeholder: t('usageLogs.filters.typePlaceholder')
      }
    },
    {
      label: t('usageLogs.filters.model'),
      key: 'model_name',
      type: 'input',
      props: { clearable: true, placeholder: t('usageLogs.filters.modelPlaceholder') }
    },
    {
      label: t('usageLogs.filters.token'),
      key: 'token_name',
      type: 'input',
      props: { clearable: true, placeholder: t('usageLogs.filters.tokenPlaceholder') }
    },
    {
      label: t('usageLogs.filters.requestId'),
      key: 'request_id',
      type: 'input',
      props: { clearable: true, placeholder: t('usageLogs.filters.requestIdPlaceholder') }
    },
    {
      label: t('usageLogs.filters.time'),
      key: 'dateRange',
      type: 'date',
      span: 8,
      props: {
        type: 'datetimerange',
        clearable: true,
        startPlaceholder: t('usageLogs.filters.startTime'),
        endPlaceholder: t('usageLogs.filters.endTime')
      }
    }
  ])

  /**
   * 构建使用日志表格列
   * @returns 表格列配置
   */
  const { columns, columnChecks } = useTableColumns<UsageLog>(() => [
    { prop: 'created_at', label: t('usageLogs.columns.time'), minWidth: 165, useSlot: true },
    { prop: 'type', label: t('usageLogs.columns.type'), width: 100, useSlot: true },
    { prop: 'model_name', label: t('usageLogs.columns.model'), minWidth: 160, useSlot: true },
    { prop: 'token_name', label: t('usageLogs.columns.token'), minWidth: 130, useSlot: true },
    { prop: 'tokens', label: t('usageLogs.columns.tokens'), minWidth: 130, useSlot: true },
    { prop: 'quota', label: t('usageLogs.columns.quota'), minWidth: 110, useSlot: true },
    { prop: 'use_time', label: t('usageLogs.columns.timing'), minWidth: 110, useSlot: true },
    {
      prop: 'content',
      label: t('usageLogs.columns.details'),
      width: 100,
      fixed: 'right',
      useSlot: true
    }
  ])

  /**
   * 将当前筛选表单转换为接口参数
   * @param includePagination 是否包含分页参数
   * @returns 使用日志查询参数
   */
  const buildQuery = (includePagination: boolean): UsageLogQuery => {
    const dateRange = activeSearchForm.dateRange
    return {
      ...(includePagination ? { p: pagination.current, page_size: pagination.size } : {}),
      type: activeSearchForm.type || undefined,
      model_name: activeSearchForm.model_name || undefined,
      token_name: activeSearchForm.token_name || undefined,
      request_id: activeSearchForm.request_id || undefined,
      start_timestamp: dateRange ? Math.floor(dateRange[0].getTime() / 1000) : undefined,
      end_timestamp: dateRange ? Math.floor(dateRange[1].getTime() / 1000) : undefined
    }
  }

  /**
   * 加载日志列表及当前筛选统计
   * @returns 无返回值
   */
  const loadUsageData = async (): Promise<void> => {
    loading.value = true
    try {
      const [listResult, statsResult] = await Promise.all([
        fetchUsageLogs(buildQuery(true)),
        fetchUsageLogStats(buildQuery(false))
      ])
      logs.value = listResult.items || []
      pagination.total = listResult.total || 0
      Object.assign(stats, statsResult)
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化美元换算配置与使用日志
   * @returns 无返回值
   */
  const initializePage = async (): Promise<void> => {
    const status = await fetchSystemStatus()
    quotaPerUnit.value = resolveQuotaPerUnit(status.quota_per_unit)
    await loadUsageData()
  }

  /**
   * 应用筛选条件并回到第一页
   * @param params 搜索组件输出的筛选条件
   * @returns 无返回值
   */
  const handleSearch = (params: Record<string, unknown>): void => {
    Object.assign(activeSearchForm, initialSearchForm, params)
    activeSearchForm.dateRange = searchForm.dateRange
    pagination.current = 1
    void loadUsageData()
  }

  /**
   * 重置筛选条件并重新加载日志
   * @returns 无返回值
   */
  const handleReset = (): void => {
    Object.assign(activeSearchForm, initialSearchForm)
    pagination.current = 1
    void loadUsageData()
  }

  /**
   * 修改每页条数并重新加载日志
   * @param size 每页条数
   * @returns 无返回值
   */
  const handleSizeChange = (size: number): void => {
    pagination.size = size
    pagination.current = 1
    void loadUsageData()
  }

  /**
   * 修改当前页并重新加载日志
   * @param page 目标页码
   * @returns 无返回值
   */
  const handleCurrentChange = (page: number): void => {
    pagination.current = page
    void loadUsageData()
  }

  /**
   * 打开日志详情弹窗
   * @param log 目标使用日志
   * @returns 无返回值
   */
  const openDetails = (log: UsageLog): void => {
    selectedLog.value = log
    detailsVisible.value = true
  }

  /**
   * 获取日志类型的展示配置
   * @param type 日志类型编号
   * @returns 类型文案与标签样式
   */
  const getLogType = (type: number): LogTypeConfig => {
    const types: Record<number, LogTypeConfig> = {
      1: { label: 'usageLogs.types.topup', tagType: 'primary' },
      2: { label: 'usageLogs.types.consume', tagType: 'success' },
      3: { label: 'usageLogs.types.manage', tagType: 'warning' },
      4: { label: 'usageLogs.types.system', tagType: 'info' },
      5: { label: 'usageLogs.types.error', tagType: 'danger' },
      6: { label: 'usageLogs.types.refund', tagType: 'warning' },
      7: { label: 'usageLogs.types.login', tagType: 'primary' }
    }
    return types[type] || { label: 'usageLogs.types.unknown', tagType: 'info' }
  }

  /**
   * 格式化秒级时间戳
   * @param timestamp 秒级时间戳
   * @returns YYYY-MM-DD HH:mm:ss 格式的本地日期时间文本
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    const dateParts = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    const timeParts = [date.getHours(), date.getMinutes(), date.getSeconds()]
    return `${dateParts.map((part) => String(part).padStart(2, '0')).join('-')} ${timeParts
      .map((part) => String(part).padStart(2, '0'))
      .join(':')}`
  }

  /**
   * 格式化数值并添加千分位
   * @param value 待格式化数值
   * @returns 本地化数值文本
   */
  const formatNumber = (value: number): string => new Intl.NumberFormat().format(value || 0)

  /**
   * 将日志 quota 格式化为高精度美元
   * @param quota 内部 quota 数值
   * @returns 带 $ 符号的美元文本
   */
  const formatQuota = (quota: number): string => formatLogQuotaUsd(quota, quotaPerUnit.value)

  /**
   * 格式化请求耗时
   * @param seconds 请求耗时秒数
   * @returns 带单位的耗时文本
   */
  const formatDuration = (seconds: number): string =>
    seconds < 1 ? `${Math.round(seconds * 1000)} ms` : `${seconds.toFixed(2)} s`

  /**
   * 解析日志元数据
   * @param metadata 日志元数据 JSON 字符串
   * @returns 可用的日志元数据对象，解析失败时返回 undefined
   */
  const parseMetadata = (metadata: string): UsageLogMetadata | undefined => {
    try {
      const parsed: unknown = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as UsageLogMetadata)
        : undefined
    } catch {
      return undefined
    }
  }

  /**
   * 将倍率格式化为官方计费详情使用的四位小数
   * @param ratio 计费倍率
   * @returns 带 x 后缀的倍率文本
   */
  const formatRatio = (ratio: number): string => `${ratio.toFixed(4)}x`

  /**
   * 将额度审计字段格式化为美元文本
   * @param value 额度审计字段值
   * @returns 美元文本或原始字符串，缺失时返回未记录文案
   */
  const formatQuotaAuditValue = (value: unknown): string => {
    if (typeof value === 'number' && Number.isFinite(value)) return formatQuota(value)
    if (typeof value === 'string' && value.trim()) return value
    return t('usageLogs.details.quotaAdjustment.notRecorded')
  }

  /**
   * 根据充值日志元数据生成额度调整详情
   * @param log 充值日志
   * @returns 额度调整详情展示项，不支持的操作返回空数组
   */
  const buildQuotaAdjustmentDetails = (log: UsageLog): BillingDetailItem[] => {
    const operation = parseMetadata(log.other)?.op
    const action = operation?.action || ''
    const params = operation?.params || {}
    const isLegacyAdjustment = action === 'generic' && params.action === 'add_quota'
    const modeKeys: Record<string, string> = {
      'user.quota_add': 'usageLogs.details.quotaAdjustment.increase',
      'user.quota_subtract': 'usageLogs.details.quotaAdjustment.decrease',
      'user.quota_override': 'usageLogs.details.quotaAdjustment.override'
    }
    const modeKey = modeKeys[action]
    if (!isLegacyAdjustment && !modeKey) return []

    const username = typeof params.target_username === 'string' ? params.target_username.trim() : ''
    const userId =
      typeof params.target_user_id === 'number' && Number.isFinite(params.target_user_id)
        ? String(params.target_user_id)
        : typeof params.target_user_id === 'string'
          ? params.target_user_id.trim()
          : ''
    let requestedQuota = params.requested_quota ?? params.quota
    if (requestedQuota === undefined && action === 'user.quota_override') {
      requestedQuota = params.to
    }
    const notRecorded = t('usageLogs.details.quotaAdjustment.notRecorded')
    const mode = isLegacyAdjustment ? String(params.mode || notRecorded) : t(modeKey)

    return [
      {
        label: t('usageLogs.details.quotaAdjustment.targetUsername'),
        value: username || notRecorded
      },
      { label: t('usageLogs.details.quotaAdjustment.userId'), value: userId || notRecorded },
      { label: t('usageLogs.details.quotaAdjustment.mode'), value: mode },
      {
        label: t('usageLogs.details.quotaAdjustment.requestedQuota'),
        value: formatQuotaAuditValue(requestedQuota)
      },
      {
        label: t('usageLogs.details.quotaAdjustment.beforeQuota'),
        value: formatQuotaAuditValue(params.from)
      },
      {
        label: t('usageLogs.details.quotaAdjustment.afterQuota'),
        value: formatQuotaAuditValue(params.to)
      }
    ]
  }

  /**
   * 根据消费日志与元数据生成计费详情
   * @param log 消费日志
   * @returns 计费详情展示项
   */
  const buildBillingDetails = (log: UsageLog): BillingDetailItem[] => {
    const metadata = parseMetadata(log.other)
    if (!metadata) return []

    const details: BillingDetailItem[] = []
    const isDynamicPricing = metadata.billing_mode === 'tiered_expr'
    const isPerCall = (metadata.model_price ?? 0) > 0

    if (isDynamicPricing) {
      details.push({
        label: t('usageLogs.details.billing.mode'),
        value: t('usageLogs.details.billing.dynamicPricing')
      })
      if (metadata.matched_tier) {
        details.push({
          label: t('usageLogs.details.billing.matchedTier'),
          value: metadata.matched_tier
        })
      }
    } else if (isPerCall) {
      details.push(
        {
          label: t('usageLogs.details.billing.mode'),
          value: t('usageLogs.details.billing.perCall')
        },
        {
          label: t('usageLogs.details.billing.modelPrice'),
          value: formatBillingUsd(metadata.model_price as number)
        }
      )
    } else {
      details.push({
        label: t('usageLogs.details.billing.mode'),
        value: t('usageLogs.details.billing.perToken')
      })
      if (metadata.model_ratio != null && Number.isFinite(metadata.model_ratio)) {
        const inputPrice = metadata.model_ratio * 2
        details.push({
          label: t('usageLogs.details.billing.inputPrice'),
          value: `${formatBillingUsd(inputPrice)}/M`
        })
        if (metadata.completion_ratio != null && Number.isFinite(metadata.completion_ratio)) {
          details.push({
            label: t('usageLogs.details.billing.outputPrice'),
            value: `${formatBillingUsd(inputPrice * metadata.completion_ratio)}/M`
          })
        }
      }
    }

    const hasUserGroupRatio =
      metadata.user_group_ratio != null &&
      Number.isFinite(metadata.user_group_ratio) &&
      metadata.user_group_ratio !== -1
    const groupRatio = hasUserGroupRatio ? metadata.user_group_ratio : metadata.group_ratio
    if (groupRatio != null && Number.isFinite(groupRatio)) {
      details.push({
        label: t(
          hasUserGroupRatio
            ? 'usageLogs.details.billing.userGroupRatio'
            : 'usageLogs.details.billing.groupRatio'
        ),
        value: formatRatio(groupRatio)
      })
    }

    if (metadata.usage_facts) {
      Object.entries(metadata.usage_facts).forEach(([label, value]) => {
        details.push({ label, value: String(value) })
      })
    }

    details.push({
      label: t('usageLogs.details.billing.totalCost'),
      value: formatQuota(log.quota)
    })
    return details
  }

  onMounted(initializePage)
</script>
