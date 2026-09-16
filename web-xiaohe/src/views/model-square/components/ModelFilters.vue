<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-g-900">{{ t('modelSquare.filters') }}</h3>
      <ElButton v-if="activeFilterCount" link type="primary" @click="emit('clear')">
        {{ t('modelSquare.clearFilters') }}
      </ElButton>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-g-600">{{ t('modelSquare.billingType') }}</p>
      <ElSelect
        :model-value="filters.quotaType"
        class="w-full"
        @update:model-value="updateFilter('quotaType', $event)"
      >
        <ElOption
          v-for="option in quotaTypeOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </ElSelect>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-g-600">{{ t('modelSquare.endpointType') }}</p>
      <ElSelect
        :model-value="filters.endpoint"
        class="w-full"
        filterable
        @update:model-value="updateFilter('endpoint', $event)"
      >
        <ElOption :label="t('modelSquare.all')" value="all" />
        <ElOption
          v-for="endpoint in endpoints"
          :key="endpoint"
          :label="endpoint"
          :value="endpoint"
        />
      </ElSelect>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-g-600">{{ t('modelSquare.vendor') }}</p>
      <ElSelect
        :model-value="filters.vendor"
        class="w-full"
        filterable
        @update:model-value="updateFilter('vendor', $event)"
      >
        <ElOption :label="t('modelSquare.all')" value="all" />
        <ElOption
          v-for="vendor in vendors"
          :key="vendor.id"
          :label="vendor.name"
          :value="String(vendor.id)"
        />
      </ElSelect>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-g-600">{{ t('modelSquare.group') }}</p>
      <ElSelect
        :model-value="filters.group"
        class="w-full"
        filterable
        @update:model-value="updateFilter('group', $event)"
      >
        <ElOption :label="t('modelSquare.all')" value="all" />
        <ElOption v-for="group in groups" :key="group" :label="group" :value="group" />
      </ElSelect>
    </div>

    <div>
      <p class="mb-2 text-xs font-medium text-g-600">{{ t('modelSquare.tag') }}</p>
      <ElSelect
        :model-value="filters.tag"
        class="w-full"
        filterable
        @update:model-value="updateFilter('tag', $event)"
      >
        <ElOption :label="t('modelSquare.all')" value="all" />
        <ElOption v-for="tag in tags" :key="tag" :label="tag" :value="tag" />
      </ElSelect>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { PricingVendor } from '@/api/model-square'
  import type { ModelFilters, QuotaTypeFilter } from '../model-square'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    /** 当前模型筛选条件 */
    filters: ModelFilters
    /** 可选供应商 */
    vendors: PricingVendor[]
    /** 可选分组 */
    groups: string[]
    /** 可选端点类型 */
    endpoints: string[]
    /** 可选标签 */
    tags: string[]
  }>()

  const emit = defineEmits<{
    /** 更新一个筛选字段 */
    update: [filters: Partial<ModelFilters>]
    /** 清空全部分类筛选 */
    clear: []
  }>()

  const { t } = useI18n()
  /** 计费类型下拉选项 */
  const quotaTypeOptions = computed<Array<{ label: string; value: QuotaTypeFilter }>>(() => [
    { label: t('modelSquare.quotaTypes.all'), value: 'all' },
    { label: t('modelSquare.quotaTypes.token'), value: 'token' },
    { label: t('modelSquare.quotaTypes.request'), value: 'request' },
    { label: t('modelSquare.quotaTypes.task'), value: 'task' }
  ])
  /** 当前已启用的分类筛选数量 */
  const activeFilterCount = computed(
    () =>
      [
        props.filters.vendor,
        props.filters.group,
        props.filters.quotaType,
        props.filters.endpoint,
        props.filters.tag
      ].filter((value) => value !== 'all').length
  )

  /**
   * 更新单个筛选字段
   * @param key 筛选字段名
   * @param value 新筛选值
   * @returns 无返回值
   */
  const updateFilter = <K extends keyof ModelFilters>(key: K, value: ModelFilters[K]): void => {
    emit('update', { [key]: value })
  }
</script>
