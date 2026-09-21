<template>
  <ElCard class="art-card h-full" shadow="never">
    <div class="flex h-full flex-col gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <div
          class="size-10 flex-cc shrink-0 rounded-custom-sm bg-g-200 text-theme"
          aria-hidden="true"
        >
          <img v-if="brandIcon" :src="brandIcon" alt="" class="size-7 object-contain" />
          <ArtSvgIcon v-else icon="ri:sparkling-2-line" class="text-xl" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-mono text-sm font-semibold text-g-900" :title="model.model_name">
            {{ model.model_name }}
          </h3>
          <p class="mt-1 truncate text-xs text-g-500">{{ providerLabel }}</p>
        </div>
        <ElTag size="small" effect="plain">
          {{ billingLabel
          }}{{ showCurrentPeriodPrice ? ` / ${t('modelSquare.currentPeriodPrice')}` : '' }}
        </ElTag>
      </div>

      <div class="flex min-h-10 min-w-0 items-start gap-2">
        <p class="line-clamp-2 min-w-0 flex-1 text-sm leading-5 text-g-600">
          {{ model.description || t('modelSquare.noDescription') }}
        </p>
      </div>

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
            <span v-if="showTokenPriceUnit" class="ml-1 text-xs font-normal text-g-500">
              / 1{{ priceOptions.tokenUnit }}
            </span>
          </p>
        </div>
        <div>
          <p class="text-xs text-g-500">{{ secondaryPriceLabel }}</p>
          <p class="mt-1 font-mono text-sm font-semibold tabular-nums text-g-900">
            {{ secondaryPrice }}
            <span v-if="showTokenPriceUnit" class="ml-1 text-xs font-normal text-g-500">
              / 1{{ priceOptions.tokenUnit }}
            </span>
          </p>
        </div>
      </div>

      <div class="flex min-w-0 items-center justify-between gap-3 border-t-d pt-3">
        <dl class="flex min-w-0 flex-1 items-center gap-3 text-xs">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <dt class="shrink-0 text-g-500">{{ t('modelSquare.group') }}</dt>
            <dd class="truncate text-g-700" :title="groupLabel">{{ groupLabel }}</dd>
          </div>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <dt class="shrink-0 text-g-500">{{ t('modelSquare.endpoints') }}</dt>
            <dd class="truncate text-g-700" :title="endpointLabel">{{ endpointLabel }}</dd>
          </div>
        </dl>
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
  import { getModelBrandIcon } from '../model-brand-icon'
  import {
    formatModelPrice,
    getCurrentPricingTierIndex,
    getDisplayPricingTiers,
    getQuotaType,
    hasExpressionPricing,
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

  /**
   * 根据模型或供应商的官方图标标识选择已知品牌图标
   * @returns 本地 SVG 资源地址；未映射时返回空字符串
   */
  const brandIcon = computed(() => getModelBrandIcon(props.model))
  /**
   * 获取模型的可展示价格分档
   * @returns 有效的展示价格分档列表
   */
  const displayTiers = computed(() => getDisplayPricingTiers(props.model))

  /** 当前模型的供应商展示名称 */
  const providerLabel = computed(() => props.model.vendor_name || t('modelSquare.unknownVendor'))
  /**
   * 获取当前模型的计费类型文案
   * @returns 动态计费或基础计费类型
   */
  const billingLabel = computed(() =>
    hasExpressionPricing(props.model)
      ? t('modelSquare.dynamicPrice')
      : t(`modelSquare.quotaTypes.${getQuotaType(props.model)}`)
  )
  /** 卡片中最多展示的两个标签 */
  const visibleTags = computed(() => parseModelTags(props.model.tags).slice(0, 2))
  /** 未直接展示的标签数量 */
  const hiddenTagCount = computed(() => Math.max(parseModelTags(props.model.tags).length - 2, 0))

  /**
   * 获取当前模型的可用分组摘要
   * @returns 以间隔符连接的分组名称，缺少分组时返回占位符
   */
  const groupLabel = computed(() => props.model.enable_groups.filter(Boolean).join(' · ') || '-')

  /**
   * 获取当前模型支持的端点摘要
   * @returns 以间隔符连接的端点名称，缺少端点时返回本地化提示
   */
  const endpointLabel = computed(() => {
    const endpoints = props.model.supported_endpoint_types || []
    return endpoints.length ? endpoints.join(' · ') : t('modelSquare.noEndpoints')
  })
  /**
   * 获取卡片第一列价格标签
   * @returns 输入或单次价格文案
   */
  const primaryPriceLabel = computed(() =>
    props.model.quota_type === 1 || displayTiers.value[0]?.fixed !== undefined
      ? t('modelSquare.pricePerRequest')
      : t('modelSquare.input')
  )
  /**
   * 获取卡片第二列价格标签
   * @returns 输出价格或分组文案
   */
  const secondaryPriceLabel = computed(() =>
    props.model.quota_type === 1 || displayTiers.value[0]?.fixed !== undefined
      ? t('modelSquare.groups')
      : t('modelSquare.output')
  )
  /**
   * 判断输入和输出价格是否需要展示 Token 单位
   * @returns 当前价格为可换算的 Token 单价时返回 true
   */
  const showTokenPriceUnit = computed(
    () =>
      props.model.quota_type === 0 &&
      displayTiers.value[0]?.fixed === undefined &&
      !(hasExpressionPricing(props.model) && !displayTiers.value.length)
  )
  /**
   * 判断卡片价格是否来自当前生效的时间档位
   * @returns 已识别当前时间档位时返回 true
   */
  const showCurrentPeriodPrice = computed(
    () => getCurrentPricingTierIndex(props.model, props.priceOptions.now) !== undefined
  )
  /**
   * 格式化卡片第一列价格
   * @returns 实际价格或动态计费提示
   */
  const primaryPrice = computed(() =>
    hasExpressionPricing(props.model) && !displayTiers.value.length
      ? t('modelSquare.dynamicPrice')
      : formatModelPrice(props.model, 'input', props.priceOptions)
  )
  /**
   * 格式化卡片第二列价格
   * @returns 输出价格、分组数量或动态计费提示
   */
  const secondaryPrice = computed(() => {
    if (props.model.quota_type === 1 || displayTiers.value[0]?.fixed !== undefined)
      return String(props.model.enable_groups.length)
    return hasExpressionPricing(props.model) && !displayTiers.value.length
      ? t('modelSquare.dynamicPrice')
      : formatModelPrice(props.model, 'output', props.priceOptions)
  })
</script>
