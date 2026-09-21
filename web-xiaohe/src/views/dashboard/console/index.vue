<!-- 普通用户概览 -->
<template>
  <div v-loading="loading" class="flex flex-col gap-5">
    <section class="art-card overflow-hidden">
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_22rem]">
        <div class="p-5">
          <div class="flex-cb gap-4 mb-5">
            <div>
              <h2 class="text-lg font-semibold text-g-900">{{ $t('dashboard.usage.title') }}</h2>
              <p class="mt-1 text-sm text-g-500">{{ $t('dashboard.usage.description') }}</p>
            </div>
            <ElButton :loading="loading" circle @click="loadOverview"
              ><ArtSvgIcon icon="ri:refresh-line"
            /></ElButton>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ArtStatsCard
              icon="ri:wallet-3-line"
              icon-style="bg-theme"
              :title="$t('dashboard.usage.balance')"
              :display-value="formatQuota(overview.quota)"
              :description="$t('dashboard.usage.balanceHint')"
            />
            <ArtStatsCard
              icon="ri:flashlight-line"
              icon-style="bg-success"
              :title="$t('dashboard.usage.used')"
              :display-value="formatQuota(overview.usedQuota)"
              :description="$t('dashboard.usage.usedHint')"
            />
            <ArtStatsCard
              icon="ri:send-plane-line"
              icon-style="bg-warning"
              :title="$t('dashboard.usage.requests')"
              :count="overview.requestCount"
              :description="$t('dashboard.usage.requestsHint')"
            />
          </div>
        </div>
        <div
          class="flex flex-col justify-between gap-5 p-5 border-t border-g-300 bg-g-100 xl:border-t-0 xl:border-l"
        >
          <div>
            <p class="text-sm font-medium text-g-600">{{ $t('dashboard.quickStart.title') }}</p>
            <p class="mt-2 text-xl font-semibold text-g-900">{{
              $t('dashboard.quickStart.heading')
            }}</p>
            <p class="mt-2 text-sm leading-6 text-g-500">{{
              $t('dashboard.quickStart.description')
            }}</p>
          </div>
          <ElButton type="primary" @click="openApiKeys"
            >{{ $t('dashboard.quickStart.action')
            }}<ArtSvgIcon class="ml-2" icon="ri:arrow-right-line"
          /></ElButton>
        </div>
      </div>
    </section>
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_22rem]">
      <ElCard class="art-card" shadow="never">
        <template #header
          ><div
            ><h3 class="font-semibold text-g-900">{{ $t('dashboard.trend.title') }}</h3
            ><p class="mt-1 text-xs text-g-500">{{ $t('dashboard.trend.description') }}</p></div
          ></template
        >
        <ArtLineChart
          :data="chartData"
          :x-axis-data="chartLabels"
          height="18rem"
          :loading="loading"
          :value-prefix="getQuotaDisplayPrefix(systemStatus)"
          :value-precision="4"
          show-area-color
        />
      </ElCard>
      <ElCard class="art-card" shadow="never">
        <template #header
          ><h3 class="font-semibold text-g-900">{{ $t('dashboard.apiInfo.title') }}</h3></template
        >
        <div class="flex flex-col gap-5">
          <div
            ><p class="text-xs text-g-500">{{ $t('dashboard.apiInfo.endpoint') }}</p
            ><div class="flex-cb gap-3 mt-2 rounded-lg bg-g-200 px-3 py-2.5"
              ><code class="min-w-0 truncate text-sm text-g-800">{{ apiEndpoint }}</code
              ><ElButton text circle @click="copyEndpoint"
                ><ArtSvgIcon icon="ri:file-copy-line" /></ElButton></div
          ></div>
          <div
            ><p class="text-xs text-g-500">{{ $t('dashboard.apiInfo.group') }}</p
            ><p class="mt-2 text-sm font-medium text-g-800">{{
              overview.group || $t('dashboard.apiInfo.defaultGroup')
            }}</p></div
          >
          <ElAlert
            :title="$t('dashboard.apiInfo.safety')"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchUserQuotaData, type QuotaDataItem } from '@/api/dashboard'
  import { fetchGetUserInfo, fetchSystemStatus, type SystemStatus } from '@/api/auth'
  import { useUserStore } from '@/store/modules/user'
  import {
    formatQuota as formatDisplayQuota,
    getQuotaDisplayPrefix,
    quotaToDisplayAmount
  } from '@/utils/quota'
  import { copyToClipboard } from '@/utils/clipboard'
  import { formatChartTime } from '@/utils/chart-time'
  import { ElMessage } from 'element-plus'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'Console' })

  /**
   * 优先使用管理员 API 配置和非默认服务地址，并补全 OpenAI API 的 /v1 后缀
   * @param status 系统公开状态
   * @returns 以 /v1 结尾的接口端点地址
   */
  const resolveApiEndpoint = (status?: SystemStatus): string => {
    const serverAddress = status?.server_address?.trim().replace(/\/+$/, '')
    // 官方默认 ServerAddress 不是定制整合入口，使用当前页面的 origin。
    const source =
      status?.api_info?.[0]?.url?.trim() ||
      (serverAddress !== 'http://localhost:3000' ? serverAddress : '') ||
      window.location.origin
    const normalizedSource = source.replace(/\/+$/, '')
    return normalizedSource.endsWith('/v1') ? normalizedSource : `${normalizedSource}/v1`
  }

  const { t } = useI18n()
  const router = useRouter()
  const userStore = useUserStore()
  const loading = ref(false)
  const usageData = ref<QuotaDataItem[]>([])
  const systemStatus = ref<SystemStatus>()
  const apiEndpoint = ref(resolveApiEndpoint())
  const overview = computed(() => ({
    quota: Number(userStore.info.quota || 0),
    usedQuota: Number(userStore.info.usedQuota || 0),
    requestCount: Number(userStore.info.requestCount || 0),
    group: userStore.info.group || ''
  }))
  /**
   * 将最近用量数据转换为管理员设置的展示数值
   * @returns 展示数值数组
   */
  const chartData = computed(() =>
    usageData.value.map((item) => quotaToDisplayAmount(Number(item.quota || 0), systemStatus.value))
  )
  /** 生成最近用量图的时间横轴标签。@returns 格式化的时间标签 */
  const chartLabels = computed(() =>
    usageData.value.map((item) => formatChartTime(item.created_at))
  )

  /**
   * 按管理员设置格式化内部 quota
   * @param quota 内部 quota 数值
   * @returns 展示额度文本
   */
  const formatQuota = (quota: number): string => formatDisplayQuota(quota, systemStatus.value)

  /**
   * 加载用户信息及最近二十四小时用量
   * @returns 无返回值
   */
  const loadOverview = async (): Promise<void> => {
    loading.value = true
    try {
      const endTimestamp = Math.floor(Date.now() / 1000)
      const startTimestamp = endTimestamp - 24 * 60 * 60
      const [userInfo, quotaData, status] = await Promise.all([
        fetchGetUserInfo(),
        fetchUserQuotaData({
          start_timestamp: startTimestamp,
          end_timestamp: endTimestamp,
          default_time: 'hour'
        }),
        fetchSystemStatus()
      ])
      userStore.setUserInfo(userInfo)
      usageData.value = quotaData
      systemStatus.value = status
      apiEndpoint.value = resolveApiEndpoint(status)
    } finally {
      loading.value = false
    }
  }

  /**
   * 打开 API 密钥列表
   * @returns 无返回值
   */
  const openApiKeys = (): void => {
    router.push({ name: 'ApiKeyList' })
  }

  /**
   * 复制 API 端点地址
   * @returns 无返回值
   */
  const copyEndpoint = async (): Promise<void> => {
    if (await copyToClipboard(apiEndpoint.value)) {
      ElMessage.success(t('dashboard.apiInfo.copied'))
    } else {
      ElMessage.error(t('setting.actions.copyFailed'))
    }
  }

  onMounted(loadOverview)
</script>
