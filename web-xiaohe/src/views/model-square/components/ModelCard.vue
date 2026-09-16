<template>
  <ElCard class="art-card h-full" shadow="never">
    <div class="flex h-full flex-col gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <div class="size-10 flex-cc shrink-0 rounded-custom-sm bg-g-200 text-theme">
          <ArtSvgIcon icon="ri:sparkling-2-line" class="text-xl" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-mono text-sm font-semibold text-g-900" :title="model.model_name">
            {{ model.model_name }}
          </h3>
          <p class="mt-1 truncate text-xs text-g-500">{{ providerLabel }}</p>
        </div>
        <ElTag size="small" effect="plain">{{ billingLabel }}</ElTag>
      </div>

      <p class="line-clamp-2 min-h-10 text-sm leading-5 text-g-600">
        {{ model.description || t('modelSquare.noDescription') }}
      </p>

      <div v-if="visibleTags.length" class="flex min-h-6 flex-wrap gap-1.5">
        <ElTag v-for="tag in visibleTags" :key="tag" size="small" type="info" effect="light">
          {{ tag }}
        </ElTag>
        <ElTag v-if="hiddenTagCount" size="small" type="info" effect="plain">
          +{{ hiddenTagCount }}
        </ElTag>
      </div>

      <div class="mt-auto grid grid-cols-2 gap-3 rounded-custom-sm bg-g-100 p-3">
        <div>
          <p class="text-xs text-g-500">{{ primaryPriceLabel }}</p>
          <p class="mt-1 font-mono text-sm font-semibold tabular-nums text-g-900">
            {{ primaryPrice }}
          </p>
        </div>
        <div>
          <p class="text-xs text-g-500">{{ secondaryPriceLabel }}</p>
          <p class="mt-1 font-mono text-sm font-semibold tabular-nums text-g-900">
            {{ secondaryPrice }}
          </p>
        </div>
      </div>

      <div class="flex min-w-0 items-center justify-between gap-3 border-t-d pt-3">
        <p class="truncate text-xs text-g-500" :title="endpointLabel">
          {{ endpointLabel }}
        </p>
        <ElButton link type="primary" @click="emit('details', model)">
          {{ t('modelSquare.details') }}
          <ArtSvgIcon icon="ri:arrow-right-s-line" class="ml-1" />
        </ElButton>
      </div>
    </div>
  </ElCard>
</template>

<script setup lang="ts">
  import type { PricingModel } from '@/api/model-square'
  import {
    formatModelPrice,
    getQuotaType,
    parseModelTags,
    type PriceOptions
  } from '../model-square'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    /** 待展示的模型定价信息 */
    model: PricingModel
    /** 当前价格展示选项 */
    priceOptions: PriceOptions
  }>()

  const emit = defineEmits<{
    /** 请求打开模型详情 */
    details: [model: PricingModel]
  }>()

  const { t } = useI18n()

  /** 当前模型的供应商展示名称 */
  const providerLabel = computed(() => props.model.vendor_name || t('modelSquare.unknownVendor'))
  /** 当前模型的计费类型文案 */
  const billingLabel = computed(() => t(`modelSquare.quotaTypes.${getQuotaType(props.model)}`))
  /** 卡片中最多展示的两个标签 */
  const visibleTags = computed(() => parseModelTags(props.model.tags).slice(0, 2))
  /** 未直接展示的标签数量 */
  const hiddenTagCount = computed(() => Math.max(parseModelTags(props.model.tags).length - 2, 0))
  /** 当前模型支持的端点摘要 */
  const endpointLabel = computed(() => {
    const endpoints = props.model.supported_endpoint_types || []
    return endpoints.length ? endpoints.join(' · ') : t('modelSquare.noEndpoints')
  })
  /** 卡片第一列价格标签 */
  const primaryPriceLabel = computed(() =>
    props.model.quota_type === 1 ? t('modelSquare.pricePerRequest') : t('modelSquare.input')
  )
  /** 卡片第二列价格标签 */
  const secondaryPriceLabel = computed(() =>
    props.model.quota_type === 1 ? t('modelSquare.groups') : t('modelSquare.output')
  )
  /** 卡片第一列价格值 */
  const primaryPrice = computed(() => formatModelPrice(props.model, 'input', props.priceOptions))
  /** 卡片第二列价格值 */
  const secondaryPrice = computed(() => {
    if (props.model.quota_type === 1) return String(props.model.enable_groups.length)
    return formatModelPrice(props.model, 'output', props.priceOptions)
  })
</script>
