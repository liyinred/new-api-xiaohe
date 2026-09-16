<template>
  <ElDrawer
    :model-value="modelValue"
    :title="model?.model_name"
    size="min(48rem, 94vw)"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="model" class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div class="size-11 flex-cc shrink-0 rounded-custom-sm bg-g-200 text-theme">
          <ArtSvgIcon icon="ri:sparkling-2-line" class="text-2xl" />
        </div>
        <div class="min-w-0">
          <h2 class="break-all font-mono text-lg font-semibold text-g-900">{{
            model.model_name
          }}</h2>
          <p class="mt-1 text-sm text-g-500">{{
            model.vendor_name || t('modelSquare.unknownVendor')
          }}</p>
        </div>
      </div>

      <p class="text-sm leading-6 text-g-600">
        {{ model.description || t('modelSquare.noDescription') }}
      </p>

      <ElTabs v-model="activeTab">
        <ElTabPane :label="t('modelSquare.overview')" name="overview">
          <div class="flex flex-col gap-4 pt-2">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-custom-sm bg-g-100 p-3">
                <p class="text-xs text-g-500">{{ t('modelSquare.billingType') }}</p>
                <p class="mt-2 text-sm font-medium text-g-900">{{ billingLabel }}</p>
              </div>
              <div class="rounded-custom-sm bg-g-100 p-3">
                <p class="text-xs text-g-500">{{ t('modelSquare.groups') }}</p>
                <p class="mt-2 text-sm font-medium text-g-900">{{ groupRows.length }}</p>
              </div>
              <div class="rounded-custom-sm bg-g-100 p-3">
                <p class="text-xs text-g-500">{{ t('modelSquare.endpoints') }}</p>
                <p class="mt-2 text-sm font-medium text-g-900">{{ endpointRows.length }}</p>
              </div>
              <div class="rounded-custom-sm bg-g-100 p-3">
                <p class="text-xs text-g-500">{{ t('modelSquare.vendor') }}</p>
                <p class="mt-2 truncate text-sm font-medium text-g-900">
                  {{ model.vendor_name || t('modelSquare.unknownVendor') }}
                </p>
              </div>
            </div>

            <ElCard class="art-card" shadow="never">
              <template #header>
                <h3 class="font-semibold text-g-900">{{ t('modelSquare.pricingByGroup') }}</h3>
              </template>
              <ElTable :data="groupRows" size="small">
                <ElTableColumn prop="name" :label="t('modelSquare.group')" min-width="130" />
                <ElTableColumn prop="ratio" :label="t('modelSquare.ratio')" width="90" />
                <ElTableColumn :label="primaryPriceColumn" min-width="140" align="right">
                  <template #default="{ row }">
                    <span class="font-mono tabular-nums">{{
                      formatGroupPrice(row.name, 'input')
                    }}</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  v-if="model.quota_type === 0"
                  :label="t('modelSquare.output')"
                  min-width="140"
                  align="right"
                >
                  <template #default="{ row }">
                    <span class="font-mono tabular-nums">{{
                      formatGroupPrice(row.name, 'output')
                    }}</span>
                  </template>
                </ElTableColumn>
              </ElTable>
              <p v-if="model.quota_type === 0" class="mt-3 text-xs text-g-500">
                {{ t('modelSquare.priceUnit', { unit: priceOptions.tokenUnit }) }}
              </p>
            </ElCard>

            <div v-if="tags.length" class="flex flex-wrap gap-2">
              <ElTag v-for="tag in tags" :key="tag" type="info">{{ tag }}</ElTag>
            </div>
          </div>
        </ElTabPane>

        <ElTabPane :label="t('modelSquare.api')" name="api">
          <div class="flex flex-col gap-3 pt-2">
            <ElEmpty v-if="endpointRows.length === 0" :description="t('modelSquare.noEndpoints')" />
            <div
              v-for="endpoint in endpointRows"
              :key="endpoint.type"
              class="rounded-custom-sm border-full-d bg-g-100 p-4"
            >
              <div class="flex items-center gap-2">
                <ElTag size="small" type="success">{{ endpoint.method }}</ElTag>
                <span class="text-sm font-medium text-g-900">{{ endpoint.type }}</span>
              </div>
              <code class="mt-3 block break-all text-xs text-g-600">{{ endpoint.path }}</code>
            </div>
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { PricingEndpoint, PricingModel } from '@/api/model-square'
  import {
    formatModelPrice,
    getQuotaType,
    parseModelTags,
    type PriceOptions,
    type PriceType
  } from '../model-square'
  import { useI18n } from 'vue-i18n'

  interface GroupRow {
    name: string
    ratio: string
  }

  interface EndpointRow {
    type: string
    method: string
    path: string
  }

  const props = defineProps<{
    /** 抽屉是否打开 */
    modelValue: boolean
    /** 当前选中的模型 */
    model?: PricingModel
    /** 全局端点配置 */
    endpoints: Record<string, PricingEndpoint>
    /** 当前价格展示选项 */
    priceOptions: PriceOptions
  }>()

  const emit = defineEmits<{
    /** 更新抽屉打开状态 */
    'update:modelValue': [value: boolean]
  }>()

  const { t } = useI18n()
  const activeTab = ref('overview')
  /** 当前模型的标签列表 */
  const tags = computed(() => parseModelTags(props.model?.tags))
  /** 当前模型的计费类型文案 */
  const billingLabel = computed(() =>
    props.model ? t(`modelSquare.quotaTypes.${getQuotaType(props.model)}`) : ''
  )
  /** 当前模型的分组价格行 */
  const groupRows = computed<GroupRow[]>(() => {
    if (!props.model) return []
    return props.model.enable_groups
      .filter((group) => group && group !== 'auto')
      .map((group) => ({
        name: group,
        ratio: `${props.model?.group_ratio?.[group] ?? 1}x`
      }))
  })
  /** 当前模型的 API 端点行 */
  const endpointRows = computed<EndpointRow[]>(() => {
    if (!props.model) return []
    return (props.model.supported_endpoint_types || []).map((type) => {
      const endpoint = props.endpoints[type]
      return {
        type,
        method: endpoint?.method || 'POST',
        path: (endpoint?.path || '-').replaceAll('{model}', props.model?.model_name || '')
      }
    })
  })
  /** 分组价格表首个价格列标题 */
  const primaryPriceColumn = computed(() =>
    props.model?.quota_type === 1 ? t('modelSquare.pricePerRequest') : t('modelSquare.input')
  )

  /**
   * 格式化指定分组的模型价格
   * @param group 分组名称
   * @param type 价格类型
   * @returns 格式化后的价格文本
   */
  const formatGroupPrice = (group: string, type: PriceType): string => {
    if (!props.model) return '-'
    return formatModelPrice(props.model, type, { ...props.priceOptions, group })
  }
</script>
