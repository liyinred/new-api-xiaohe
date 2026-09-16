<template>
  <div v-loading="loading" class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-g-900">{{ t('dashboard.modelAnalytics.title') }}</h2>
        <p class="mt-1 text-sm text-g-500">{{ currentRangeLabel }}</p>
      </div>
      <ElButton @click="openFilterDialog">
        <ArtSvgIcon class="mr-1" icon="ri:filter-3-line" />
        {{ t('dashboard.modelAnalytics.filter') }}
      </ElButton>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <ArtStatsCard
        v-for="item in statCards"
        :key="item.title"
        :icon="item.icon"
        :icon-style="item.iconStyle"
        :title="item.title"
        :display-value="item.value"
        :description="item.description"
      />
    </div>

    <ElCard class="art-card" shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold text-g-900">
              {{ t('dashboard.modelAnalytics.quotaDistribution') }}
            </h3>
            <p class="mt-1 text-xs text-g-500">
              {{ t('dashboard.modelAnalytics.total') }}: {{ totalQuotaLabel }}
            </p>
          </div>
          <ElRadioGroup v-model="quotaChartMode" size="small">
            <ElRadioButton value="bar">
              {{ t('dashboard.modelAnalytics.barChart') }}
            </ElRadioButton>
            <ElRadioButton value="area">
              {{ t('dashboard.modelAnalytics.areaChart') }}
            </ElRadioButton>
          </ElRadioGroup>
        </div>
      </template>
      <ElEmpty v-if="!loading && !hasData" :description="t('dashboard.modelAnalytics.noData')" />
      <ArtBarChart
        v-else-if="quotaChartMode === 'bar'"
        :data="chartData.quotaByTime"
        :x-axis-data="chartData.timeLabels"
        height="20rem"
        :loading="loading"
        value-prefix="$"
      />
      <ArtLineChart
        v-else
        :data="chartData.quotaAreaSeries"
        :x-axis-data="chartData.timeLabels"
        height="20rem"
        :loading="loading"
        value-prefix="$"
        show-area-color
      />
    </ElCard>

    <ElCard class="art-card" shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold text-g-900">{{ t('dashboard.modelAnalytics.title') }}</h3>
            <p class="mt-1 text-xs text-g-500">
              {{ t('dashboard.modelAnalytics.total') }}:
              {{ formatMetric(summary.totalCount, locale) }}
            </p>
          </div>
          <ElRadioGroup v-model="analyticsTab" size="small">
            <ElRadioButton value="trend">
              {{ t('dashboard.modelAnalytics.callTrend') }}
            </ElRadioButton>
            <ElRadioButton value="distribution">
              {{ t('dashboard.modelAnalytics.callDistribution') }}
            </ElRadioButton>
            <ElRadioButton value="ranking">
              {{ t('dashboard.modelAnalytics.callRanking') }}
            </ElRadioButton>
          </ElRadioGroup>
        </div>
      </template>
      <ElEmpty v-if="!loading && !hasData" :description="t('dashboard.modelAnalytics.noData')" />
      <ArtLineChart
        v-else-if="analyticsTab === 'trend'"
        :data="chartData.callTrendSeries"
        :x-axis-data="chartData.timeLabels"
        height="20rem"
        :loading="loading"
        show-legend
      />
      <ArtRingChart
        v-else-if="analyticsTab === 'distribution'"
        :data="chartData.callDistribution"
        :center-text="formatMetric(summary.totalCount, locale)"
        height="20rem"
        :loading="loading"
        show-legend
      />
      <ArtHBarChart
        v-else
        :data="chartData.callRankingValues"
        :x-axis-data="chartData.callRankingLabels"
        height="20rem"
        :loading="loading"
      />
    </ElCard>

    <ElDialog
      v-model="filterDialogVisible"
      :title="t('dashboard.modelAnalytics.filterTitle')"
      width="32rem"
    >
      <ElForm label-position="top">
        <ElFormItem :label="t('dashboard.modelAnalytics.quickRange')">
          <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <ElButton
              v-for="preset in rangePresets"
              :key="preset.days"
              :type="selectedPresetDays === preset.days ? 'primary' : 'default'"
              @click="selectQuickRange(preset.days)"
            >
              {{ t(preset.label) }}
            </ElButton>
          </div>
        </ElFormItem>
        <ElFormItem :label="t('dashboard.modelAnalytics.customRange')">
          <ElDatePicker
            v-model="draftRange"
            class="w-full"
            type="datetimerange"
            range-separator="-"
            :clearable="false"
            @change="selectedPresetDays = null"
          />
        </ElFormItem>
        <ElFormItem :label="t('dashboard.modelAnalytics.granularity')">
          <ElSelect v-model="draftGranularity" class="w-full">
            <ElOption :label="t('dashboard.modelAnalytics.hour')" value="hour" />
            <ElOption :label="t('dashboard.modelAnalytics.day')" value="day" />
            <ElOption :label="t('dashboard.modelAnalytics.week')" value="week" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="resetFilters">{{ t('dashboard.modelAnalytics.reset') }}</ElButton>
          <ElButton type="primary" @click="applyFilters">
            {{ t('dashboard.modelAnalytics.apply') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { fetchSystemStatus } from '@/api/auth'
  import { fetchUserQuotaData, type QuotaDataItem } from '@/api/dashboard'
  import { useUserStore } from '@/store/modules/user'
  import { formatQuotaUsd, resolveQuotaPerUnit } from '@/utils/quota'
  import { ElMessage } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import {
    buildAnalyticsChartData,
    createRecentFilters,
    formatMetric,
    summarizeAnalytics,
    type AnalyticsFilters,
    type TimeGranularity
  } from './model-analytics'

  defineOptions({ name: 'ModelAnalytics' })

  const { t, locale } = useI18n()
  const userStore = useUserStore()
  const loading = ref(false)
  const filterDialogVisible = ref(false)
  const quotaData = ref<QuotaDataItem[]>([])
  const quotaPerUnit = ref(500000)
  const filters = ref<AnalyticsFilters>(createRecentFilters(1))
  const draftRange = ref<[Date, Date]>([
    new Date(filters.value.startTimestamp * 1000),
    new Date(filters.value.endTimestamp * 1000)
  ])
  const draftGranularity = ref<TimeGranularity>('hour')
  const selectedPresetDays = ref<number | null>(1)
  const quotaChartMode = ref<'bar' | 'area'>('bar')
  const analyticsTab = ref<'trend' | 'distribution' | 'ranking'>('trend')
  const rangePresets = [
    { days: 1, label: 'dashboard.modelAnalytics.oneDay' },
    { days: 7, label: 'dashboard.modelAnalytics.sevenDays' },
    { days: 14, label: 'dashboard.modelAnalytics.fourteenDays' },
    { days: 29, label: 'dashboard.modelAnalytics.twentyNineDays' }
  ] as const

  const isAdministrator = computed(() =>
    (userStore.info.roles || []).some((role) => role === 'R_SUPER' || role === 'R_ADMIN')
  )
  const summary = computed(() => summarizeAnalytics(quotaData.value, filters.value))
  const chartData = computed(() =>
    buildAnalyticsChartData(
      quotaData.value,
      filters.value.granularity,
      locale.value,
      quotaPerUnit.value
    )
  )
  const hasData = computed(() => quotaData.value.length > 0)
  const totalQuotaLabel = computed(() =>
    formatQuotaUsd(summary.value.totalQuota, quotaPerUnit.value)
  )
  const currentRangeLabel = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${formatter.format(filters.value.startTimestamp * 1000)} - ${formatter.format(filters.value.endTimestamp * 1000)}`
  })
  const statCards = computed(() => [
    {
      title: t('dashboard.modelAnalytics.totalCount'),
      value: formatMetric(summary.value.totalCount, locale.value),
      description: t('dashboard.modelAnalytics.totalCountHint'),
      icon: 'ri:hashtag',
      iconStyle: 'bg-theme'
    },
    {
      title: t('dashboard.modelAnalytics.totalQuota'),
      value: totalQuotaLabel.value,
      description: t('dashboard.modelAnalytics.totalQuotaHint'),
      icon: 'ri:coins-line',
      iconStyle: 'bg-success'
    },
    {
      title: t('dashboard.modelAnalytics.totalTokens'),
      value: formatMetric(summary.value.totalTokens, locale.value),
      description: t('dashboard.modelAnalytics.totalTokensHint'),
      icon: 'ri:stack-line',
      iconStyle: 'bg-info'
    },
    {
      title: t('dashboard.modelAnalytics.averageRpm'),
      value: formatMetric(summary.value.averageRpm, locale.value, 3),
      description: t('dashboard.modelAnalytics.averageRpmHint'),
      icon: 'ri:speed-up-line',
      iconStyle: 'bg-secondary'
    },
    {
      title: t('dashboard.modelAnalytics.averageTpm'),
      value: formatMetric(summary.value.averageTpm, locale.value, 3),
      description: t('dashboard.modelAnalytics.averageTpmHint'),
      icon: 'ri:flashlight-line',
      iconStyle: 'bg-warning'
    }
  ])

  /**
   * 加载当前筛选范围内的模型调用数据
   * @returns 无返回值
   */
  const loadAnalytics = async (): Promise<void> => {
    loading.value = true
    try {
      const [data, status] = await Promise.all([
        fetchUserQuotaData(
          {
            start_timestamp: filters.value.startTimestamp,
            end_timestamp: filters.value.endTimestamp,
            default_time: filters.value.granularity
          },
          isAdministrator.value
        ),
        fetchSystemStatus()
      ])
      quotaData.value = data
      quotaPerUnit.value = resolveQuotaPerUnit(status.quota_per_unit)
    } catch {
      quotaData.value = []
      ElMessage.error(t('dashboard.modelAnalytics.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  /**
   * 打开筛选弹窗并同步当前生效条件
   * @returns 无返回值
   */
  const openFilterDialog = (): void => {
    draftRange.value = [
      new Date(filters.value.startTimestamp * 1000),
      new Date(filters.value.endTimestamp * 1000)
    ]
    draftGranularity.value = filters.value.granularity
    filterDialogVisible.value = true
  }

  /**
   * 选择快捷时间范围并匹配推荐聚合粒度
   * @param days 最近天数
   * @returns 无返回值
   */
  const selectQuickRange = (days: number): void => {
    const recentFilters = createRecentFilters(days)
    draftRange.value = [
      new Date(recentFilters.startTimestamp * 1000),
      new Date(recentFilters.endTimestamp * 1000)
    ]
    draftGranularity.value = recentFilters.granularity
    selectedPresetDays.value = days
  }

  /**
   * 应用弹窗中的筛选条件并重新加载数据
   * @returns 无返回值
   */
  const applyFilters = (): void => {
    filters.value = {
      startTimestamp: Math.floor(draftRange.value[0].getTime() / 1000),
      endTimestamp: Math.floor(draftRange.value[1].getTime() / 1000),
      granularity: draftGranularity.value
    }
    filterDialogVisible.value = false
    void loadAnalytics()
  }

  /**
   * 恢复默认最近一天筛选并重新加载数据
   * @returns 无返回值
   */
  const resetFilters = (): void => {
    filters.value = createRecentFilters(1)
    selectedPresetDays.value = 1
    filterDialogVisible.value = false
    void loadAnalytics()
  }

  onMounted(loadAnalytics)
</script>
