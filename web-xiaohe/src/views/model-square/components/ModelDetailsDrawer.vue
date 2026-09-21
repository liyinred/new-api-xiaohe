<template>
  <ElDrawer
    :model-value="modelValue"
    size="min(48rem, 94vw)"
    :with-header="false"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="model" class="flex flex-col gap-5">
      <div class="flex items-start gap-3">
        <div
          class="size-11 flex-cc shrink-0 rounded-custom-sm bg-g-200 text-theme"
          aria-hidden="true"
        >
          <img v-if="brandIcon" :src="brandIcon" alt="" class="size-7 object-contain" />
          <ArtSvgIcon v-else icon="ri:sparkling-2-line" class="text-xl" />
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
                <p
                  class="mt-2 break-words text-sm font-medium text-g-900"
                  :title="model.enable_groups.join(' · ')"
                >
                  {{ model.enable_groups.join(' · ') || '-' }}
                </p>
              </div>
              <div class="rounded-custom-sm bg-g-100 p-3">
                <p class="text-xs text-g-500">{{ t('modelSquare.endpoints') }}</p>
                <p
                  class="mt-2 break-words text-sm font-medium text-g-900"
                  :title="model.supported_endpoint_types?.join(' · ')"
                >
                  {{ model.supported_endpoint_types?.join(' · ') || '-' }}
                </p>
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
              <p v-if="hasExpressionPricing(model)" class="mb-3 text-sm text-g-500">
                {{ t('modelSquare.dynamicRuleHint') }}
              </p>
              <code
                v-if="hasUnsupportedExpression"
                class="mb-3 block break-all text-xs text-g-600"
                >{{ model.billing_expr }}</code
              >
              <ElTable v-if="!hasUnsupportedExpression" :data="groupRows" size="small">
                <ElTableColumn prop="name" :label="t('modelSquare.group')" min-width="130" />
                <ElTableColumn prop="ratio" :label="t('modelSquare.ratio')" width="90" />
                <ElTableColumn :label="primaryPriceColumn" min-width="140" align="right">
                  <template #default="{ row }">
                    <span class="font-mono tabular-nums">
                      {{ formatGroupPrice(row.group, 'input', row.tierIndex) }}
                      <span
                        v-if="model.quota_type === 0 && displayTiers[0]?.fixed === undefined"
                        class="ml-1 text-xs font-normal text-g-500"
                      >
                        / 1{{ priceOptions.tokenUnit }}
                      </span>
                    </span>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  v-if="model.quota_type === 0 && displayTiers[0]?.fixed === undefined"
                  :label="t('modelSquare.output')"
                  min-width="140"
                  align="right"
                >
                  <template #default="{ row }">
                    <span class="font-mono tabular-nums">
                      {{ formatGroupPrice(row.group, 'output', row.tierIndex) }}
                      <span class="ml-1 text-xs font-normal text-g-500">
                        / 1{{ priceOptions.tokenUnit }}
                      </span>
                    </span>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  v-if="
                    model.quota_type === 0 &&
                    (displayTiers.some((tier) => tier.cache !== undefined) ||
                      model.cache_ratio != null)
                  "
                  :label="t('modelSquare.cacheRead')"
                  min-width="140"
                  align="right"
                >
                  <template #default="{ row }">
                    <span class="font-mono tabular-nums">{{
                      formatGroupPrice(row.group, 'cache', row.tierIndex)
                    }}</span>
                  </template>
                </ElTableColumn>
              </ElTable>
              <p
                v-if="
                  !hasExpressionPricing(model) &&
                  model.quota_type === 0 &&
                  displayTiers[0]?.fixed === undefined
                "
                class="mt-3 text-xs text-g-500"
              >
                {{ t('modelSquare.priceUnit', { unit: priceOptions.tokenUnit }) }}
              </p>
              <section v-if="displayTiers.length > 1" class="mt-4">
                <h4 class="mb-3 text-sm font-medium text-g-800">{{ t('modelSquare.tiers') }}</h4>
                <div class="flex flex-col gap-3">
                  <div
                    v-for="(tier, index) in displayTiers"
                    :key="`${tier.label}-${index}`"
                    class="rounded-custom-sm bg-g-100 p-3"
                  >
                    <ElTag size="small" type="primary" effect="light" round>{{ tier.label }}</ElTag>
                    <p class="mt-2 text-sm text-g-600">{{ formatTierRule(index) }}</p>
                  </div>
                </div>
              </section>
            </ElCard>

            <div v-if="tags.length" class="flex flex-wrap gap-2">
              <ElTag v-for="tag in tags" :key="tag" type="info">{{ tag }}</ElTag>
            </div>
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { PricingModel } from '@/api/model-square'
  import { getModelBrandIcon } from '../model-brand-icon'
  import {
    formatModelPrice,
    getDisplayPricingTiers,
    getQuotaType,
    hasExpressionPricing,
    parseModelTags,
    type PriceOptions,
    type PriceType
  } from '../model-square'
  import { useI18n } from 'vue-i18n'

  interface GroupRow {
    name: string
    group: string
    ratio: string
    tierIndex?: number
  }

  const props = defineProps<{
    /** 抽屉是否打开 */
    modelValue: boolean
    /** 当前选中的模型 */
    model?: PricingModel
    /** 当前价格展示选项 */
    priceOptions: PriceOptions
  }>()

  const emit = defineEmits<{
    /** 更新抽屉打开状态 */
    'update:modelValue': [value: boolean]
  }>()

  const { t, locale } = useI18n()
  const activeTab = ref('overview')
  /**
   * 获取当前模型的品牌图标
   * @returns 本地 SVG 资源地址；未映射或无模型时返回空字符串
   */
  const brandIcon = computed(() => (props.model ? getModelBrandIcon(props.model) : ''))
  /**
   * 获取当前模型各分档的有效价格
   * @returns 分档价格列表
   */
  const displayTiers = computed(() => (props.model ? getDisplayPricingTiers(props.model) : []))
  /** 当前模型的标签列表 */
  const tags = computed(() => parseModelTags(props.model?.tags))
  /**
   * 获取模型的计费类型文案
   * @returns 动态计费或基础计费类型
   */
  const billingLabel = computed(() =>
    props.model
      ? hasExpressionPricing(props.model)
        ? t('modelSquare.dynamicPrice')
        : t(`modelSquare.quotaTypes.${getQuotaType(props.model)}`)
      : ''
  )
  /**
   * 判断当前表达式是否无法安全换算为单价
   * @returns 是否需要展示原始动态计费表达式
   */
  const hasUnsupportedExpression = computed(() =>
    Boolean(props.model && hasExpressionPricing(props.model) && !displayTiers.value.length)
  )
  /**
   * 组合当前模型的分组与可展示的价格分档
   * @returns 分组价格行
   */
  const groupRows = computed<GroupRow[]>(() => {
    if (!props.model) return []
    const tiers = displayTiers.value
    return props.model.enable_groups
      .filter((group) => group && group !== 'auto')
      .flatMap((group) =>
        (tiers.length ? tiers : [undefined]).map((tier, tierIndex) => ({
          name: tier ? `${group} · ${tier.label}` : group,
          ratio: `${props.model?.group_ratio?.[group] ?? 1}x`,
          tierIndex: tier ? tierIndex : undefined,
          group
        }))
      )
  })
  /**
   * 获取分组价格表首列标题
   * @returns 输入或单次价格文案
   */
  const primaryPriceColumn = computed(() =>
    props.model?.quota_type === 1 || (props.model && displayTiers.value[0]?.fixed !== undefined)
      ? t('modelSquare.pricePerRequest')
      : t('modelSquare.input')
  )

  /**
   * 将星期和小时比较转换为用户可读的时段说明
   * @param condition 分档表达式中的适用条件
   * @returns 时段文本及其时区，无法解析时返回 null
   */
  const describeTimeRule = (condition: string): { text: string; timezone: string } | null => {
    const comparison = /(weekday|hour)\(\s*(['"])([^'"]+)\2\s*\)\s*(>=|<=|>|<)\s*(\d+)/g
    const matches = [...condition.matchAll(comparison)]
    if (!matches.length || condition.replace(comparison, '').replace(/&&|\|\||[()\s]/g, '')) {
      return null
    }
    const timezone = matches[0][3]
    if (matches.some((match) => match[3] !== timezone)) return null
    const weekdays = matches.filter((match) => match[1] === 'weekday')
    const hours = matches.filter((match) => match[1] === 'hour')
    if ((weekdays.length !== 0 && weekdays.length !== 2) || hours.length % 2 !== 0) return null
    const shape = condition.replace(comparison, 'X').replace(/\s/g, '')
    if (weekdays.length && !(hours.length ? shape.startsWith('X&&X&&') : shape === 'X&&X')) {
      return null
    }
    if ((shape.match(/\|\|/g) || []).length !== Math.max(0, hours.length / 2 - 1)) return null

    /**
     * 将相邻上下界比较换算为半开区间
     * @param start 起始比较
     * @param end 结束比较
     * @returns 起止整数，不符合区间规则时返回 null
     */
    const range = (start: RegExpMatchArray, end: RegExpMatchArray): [number, number] | null => {
      if (!['>=', '>'].includes(start[4]) || !['<', '<='].includes(end[4])) return null
      const from = Number(start[5]) + Number(start[4] === '>')
      const to = Number(end[5]) + Number(end[4] === '<=')
      return from < to ? [from, to] : null
    }

    let days = ''
    if (weekdays.length) {
      const bounds = range(weekdays[0], weekdays[1])
      if (!bounds || bounds[0] < 0 || bounds[1] > 7) return null
      const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' })
      const day = (value: number): string =>
        formatter.format(new Date(Date.UTC(2026, 0, 4 + value)))
      days =
        bounds[1] - bounds[0] === 1
          ? day(bounds[0])
          : t('modelSquare.timeRange', { start: day(bounds[0]), end: day(bounds[1] - 1) })
    }
    const windows: string[] = []
    for (let index = 0; index < hours.length; index += 2) {
      const bounds = range(hours[index], hours[index + 1])
      if (!bounds || bounds[0] < 0 || bounds[1] > 24) return null
      const clock = (value: number): string => `${String(value).padStart(2, '0')}:00`
      windows.push(t('modelSquare.timeRange', { start: clock(bounds[0]), end: clock(bounds[1]) }))
    }
    const hoursText = windows.join(t('modelSquare.timeOr'))
    const text =
      days && hoursText
        ? t('modelSquare.timeSchedule', { days, hours: hoursText })
        : days || hoursText
    return text ? { text, timezone } : null
  }

  /**
   * 格式化档位的适用时段，兜底档位展示前一条件以外的时段
   * @param index 档位序号
   * @returns 本地化的适用规则
   */
  const formatTierRule = (index: number): string => {
    const condition = displayTiers.value[index]?.condition
    const base = describeTimeRule(condition || displayTiers.value[0]?.condition || '')
    if (base) {
      const text = condition ? base.text : t('modelSquare.outsidePeriod', { condition: base.text })
      return t('modelSquare.timeWithZone', { condition: text, timezone: base.timezone })
    }
    return condition || t('modelSquare.otherwise')
  }

  /**
   * 格式化指定分组的模型价格
   * @param group 分组名称
   * @param type 价格类型
   * @param tierIndex 表达式价格分档序号
   * @returns 格式化后的价格文本
   */
  const formatGroupPrice = (group: string, type: PriceType, tierIndex?: number): string => {
    if (!props.model) return '-'
    return formatModelPrice(props.model, type, { ...props.priceOptions, group, tierIndex })
  }
</script>
