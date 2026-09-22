<template>
  <div v-loading="loading" class="flex min-h-full flex-col gap-4">
    <section class="art-card overflow-hidden p-5 sm:p-7">
      <div class="mx-auto max-w-3xl text-center">
        <h1 class="text-2xl font-semibold text-g-900 sm:text-3xl">
          {{ t('modelSquare.title') }}
        </h1>
        <p class="mx-auto mt-2 max-w-2xl text-sm leading-6 text-g-500">
          {{ t('modelSquare.description') }}
        </p>
        <ElInput
          v-model="filters.search"
          class="mx-auto mt-5 max-w-2xl"
          size="large"
          clearable
          :placeholder="t('modelSquare.searchPlaceholder')"
        >
          <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
        </ElInput>
      </div>
    </section>

    <div class="grid min-w-0 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <ElCard class="art-card hidden self-start xl:block" shadow="never">
        <ModelFilters
          :filters="filters"
          :vendors="vendors"
          :groups="groups"
          :endpoints="endpointTypes"
          :tags="tags"
          @update="updateFilters"
          @clear="clearFilters"
        />
      </ElCard>

      <main class="min-w-0">
        <ElCard class="art-card mb-4" shadow="never">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <ElButton class="xl:hidden" @click="filterDrawerVisible = true">
                <ArtSvgIcon icon="ri:filter-3-line" class="mr-1" />
                {{ t('modelSquare.filters') }}
                <ElBadge v-if="activeFilterCount" :value="activeFilterCount" class="ml-2" />
              </ElButton>
              <span class="text-sm text-g-500">
                {{
                  t('modelSquare.resultCount', {
                    filtered: filteredModels.length,
                    total: models.length
                  })
                }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <ElSelect v-model="filters.sort" class="w-42">
                <ElOption :label="t('modelSquare.sort.name')" value="name" />
                <ElOption :label="t('modelSquare.sort.priceLow')" value="price-low" />
                <ElOption :label="t('modelSquare.sort.priceHigh')" value="price-high" />
              </ElSelect>
              <ElRadioGroup v-model="tokenUnit">
                <ElRadioButton value="M">1M</ElRadioButton>
                <ElRadioButton value="K">1K</ElRadioButton>
              </ElRadioGroup>
              <ElTooltip :content="t('modelSquare.rechargePriceHint')">
                <ElSwitch
                  v-model="showRechargePrice"
                  :active-text="t('modelSquare.rechargePrice')"
                />
              </ElTooltip>
              <ElRadioGroup v-model="viewMode">
                <ElRadioButton value="card" :aria-label="t('modelSquare.cardView')">
                  <ArtSvgIcon icon="ri:grid-line" />
                </ElRadioButton>
                <ElRadioButton value="table" :aria-label="t('modelSquare.tableView')">
                  <ArtSvgIcon icon="ri:list-check" />
                </ElRadioButton>
              </ElRadioGroup>
            </div>
          </div>
        </ElCard>

        <ElEmpty
          v-if="!loading && filteredModels.length === 0"
          class="art-card py-12"
          :description="t('modelSquare.empty')"
        >
          <ElButton type="primary" @click="resetAllFilters">{{
            t('modelSquare.clearAll')
          }}</ElButton>
        </ElEmpty>

        <div v-else-if="viewMode === 'card'" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <ModelCard
            v-for="model in filteredModels"
            :key="model.model_name"
            :model="model"
            :price-options="priceOptions"
            @details="openDetails"
          />
        </div>

        <ElCard v-else class="art-card" shadow="never">
          <ElTable :data="filteredModels" row-key="model_name">
            <ElTableColumn :label="t('modelSquare.model')" min-width="220" fixed="left">
              <template #default="{ row }">
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-medium text-g-900">{{
                    row.model_name
                  }}</p>
                  <p class="mt-1 truncate text-xs text-g-500">
                    {{ row.vendor_name || t('modelSquare.unknownVendor') }}
                  </p>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="t('modelSquare.billingType')" width="120">
              <template #default="{ row }">
                <ElTag size="small" effect="plain">{{ getBillingLabel(row) }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="primaryPriceColumn" min-width="145" align="right">
              <template #default="{ row }">
                <div>
                  <span class="font-mono tabular-nums">{{ formatRowPrice(row, 'input') }}</span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="t('modelSquare.output')" min-width="145" align="right">
              <template #default="{ row }">
                <span class="font-mono tabular-nums">
                  {{ row.quota_type === 1 ? '-' : formatRowPrice(row, 'output') }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="t('modelSquare.endpoints')" min-width="190">
              <template #default="{ row }">
                <span class="text-xs text-g-600">
                  {{ row.supported_endpoint_types?.join(', ') || '-' }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="t('modelSquare.groups')" min-width="150">
              <template #default="{ row }">
                <span class="text-xs text-g-600">{{ row.enable_groups.join(', ') || '-' }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn :label="t('modelSquare.actions')" width="100" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openDetails(row)">
                  {{ t('modelSquare.details') }}
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </main>
    </div>

    <ElDrawer
      v-model="filterDrawerVisible"
      :title="t('modelSquare.filters')"
      size="min(22rem, 90vw)"
    >
      <ModelFilters
        :filters="filters"
        :vendors="vendors"
        :groups="groups"
        :endpoints="endpointTypes"
        :tags="tags"
        @update="updateFilters"
        @clear="clearFilters"
      />
    </ElDrawer>

    <ModelDetailsDrawer
      v-model="detailsVisible"
      :model="selectedModel"
      :price-options="priceOptions"
    />
  </div>
</template>

<script setup lang="ts">
  import { fetchSystemStatus, type SystemStatus } from '@/api/auth'
  import { fetchModelSquare, type PricingModel, type PricingVendor } from '@/api/model-square'
  import ModelCard from './components/ModelCard.vue'
  import ModelDetailsDrawer from './components/ModelDetailsDrawer.vue'
  import ModelFilters from './components/ModelFilters.vue'
  import {
    collectEndpointTypes,
    collectModelTags,
    filterAndSortModels,
    formatModelPrice,
    getDisplayPricingTiers,
    hasExpressionPricing,
    getQuotaType,
    type ModelFilters as ModelFilterState,
    type PriceType,
    type TokenUnit
  } from './model-square'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'ModelSquare' })

  const { t } = useI18n()
  const loading = ref(false)
  const models = ref<PricingModel[]>([])
  const vendors = ref<PricingVendor[]>([])
  const status = ref<SystemStatus>()
  const tokenUnit = ref<TokenUnit>('M')
  const viewMode = ref<'card' | 'table'>('card')
  const showRechargePrice = ref(false)
  const filterDrawerVisible = ref(false)
  const detailsVisible = ref(false)
  const selectedModel = ref<PricingModel>()
  const billingTime = useNow({ interval: 60000 })
  const filters = reactive<ModelFilterState>({
    search: '',
    vendor: 'all',
    group: 'all',
    quotaType: 'all',
    endpoint: 'all',
    tag: 'all',
    sort: 'name'
  })

  /** 模型列表中的全部可选分组 */
  const groups = computed(() =>
    [...new Set(models.value.flatMap((model) => model.enable_groups))]
      .filter((group) => group && group !== 'auto')
      .sort()
  )
  /** 模型列表中的全部可选标签 */
  const tags = computed(() => collectModelTags(models.value))
  /** 模型列表中的全部可选端点类型 */
  const endpointTypes = computed(() => collectEndpointTypes(models.value))
  /** 搜索防抖后的筛选文本 */
  const debouncedSearch = refDebounced(toRef(filters, 'search'), 200)
  /** 应用当前筛选条件后的模型列表 */
  const filteredModels = computed(() =>
    filterAndSortModels(models.value, { ...filters, search: debouncedSearch.value })
  )
  /** 当前已启用的分类筛选数量 */
  const activeFilterCount = computed(
    () =>
      [filters.vendor, filters.group, filters.quotaType, filters.endpoint, filters.tag].filter(
        (value) => value !== 'all'
      ).length
  )
  /** 当前统一使用的价格展示选项 */
  const priceOptions = computed(() => ({
    tokenUnit: tokenUnit.value,
    group: filters.group,
    showRechargePrice: showRechargePrice.value,
    status: status.value,
    now: billingTime.value
  }))
  /** 表格首个价格列标题 */
  const primaryPriceColumn = computed(() =>
    filters.quotaType === 'request' ? t('modelSquare.pricePerRequest') : t('modelSquare.input')
  )

  /**
   * 加载模型广场和系统币种配置
   * @returns 无返回值
   */
  const loadModelSquare = async (): Promise<void> => {
    loading.value = true
    try {
      const [pricing, systemStatus] = await Promise.all([fetchModelSquare(), fetchSystemStatus()])
      const vendorMap = new Map(pricing.vendors.map((vendor) => [vendor.id, vendor]))
      models.value = pricing.data.map((model) => {
        const vendor = model.vendor_id ? vendorMap.get(model.vendor_id) : undefined
        return {
          ...model,
          vendor_name: vendor?.name,
          vendor_icon: vendor?.icon,
          vendor_description: vendor?.description,
          group_ratio: pricing.group_ratio
        }
      })
      vendors.value = pricing.vendors
      status.value = systemStatus
    } finally {
      loading.value = false
    }
  }

  /**
   * 合并一组分类筛选条件
   * @param changes 需要更新的筛选字段
   * @returns 无返回值
   */
  const updateFilters = (changes: Partial<ModelFilterState>): void => {
    Object.assign(filters, changes)
  }

  /**
   * 清空供应商、分组、计费、端点和标签筛选
   * @returns 无返回值
   */
  const clearFilters = (): void => {
    Object.assign(filters, {
      vendor: 'all',
      group: 'all',
      quotaType: 'all',
      endpoint: 'all',
      tag: 'all'
    })
  }

  /**
   * 清空搜索与全部分类筛选
   * @returns 无返回值
   */
  const resetAllFilters = (): void => {
    filters.search = ''
    clearFilters()
  }

  /**
   * 打开指定模型的详情抽屉
   * @param model 待查看的模型
   * @returns 无返回值
   */
  const openDetails = (model: PricingModel): void => {
    selectedModel.value = model
    detailsVisible.value = true
  }

  /**
   * 获取模型计费类型的本地化文案
   * @param model 模型定价信息
   * @returns 计费类型文案
   */
  const getBillingLabel = (model: PricingModel): string =>
    hasExpressionPricing(model)
      ? t('modelSquare.dynamicPrice')
      : t(`modelSquare.quotaTypes.${getQuotaType(model)}`)

  /**
   * 格式化表格中的模型价格
   * @param model 模型定价信息
   * @param type 价格类型
   * @returns 格式化后的价格文本
   */
  const formatRowPrice = (model: PricingModel, type: PriceType): string =>
    hasExpressionPricing(model) && getDisplayPricingTiers(model).length === 0
      ? t('modelSquare.dynamicPrice')
      : formatModelPrice(model, type, priceOptions.value)

  onMounted(loadModelSquare)
</script>
