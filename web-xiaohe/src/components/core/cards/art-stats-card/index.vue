<!-- 统计卡片 -->
<template>
  <div
    class="art-card min-h-24 flex-c px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
    :class="boxStyle"
  >
    <div v-if="icon" class="mr-3 size-10 flex-cc rounded-lg text-lg text-white" :class="iconStyle">
      <ArtSvgIcon :icon="icon"></ArtSvgIcon>
    </div>
    <div class="flex-1 space-y-0.5">
      <p class="m-0 text-sm font-medium" :style="{ color: textColor }" v-if="title">
        {{ title }}
      </p>
      <p v-if="displayValue !== undefined" class="m-0 text-xl font-medium text-g-900 tabular-nums">
        {{ displayValue }}
      </p>
      <ArtCountTo
        class="m-0 text-xl font-medium"
        v-else-if="count !== undefined"
        :target="count"
        :duration="2000"
        :decimals="decimals"
        :separator="separator"
      />
      <p
        class="m-0 text-xs leading-4 text-g-500 opacity-90"
        :style="{ color: textColor }"
        v-if="description"
        >{{ description }}</p
      >
    </div>
    <div v-if="showArrow">
      <ArtSvgIcon icon="ri:arrow-right-s-line" class="text-xl text-g-500" />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtStatsCard' })

  interface StatsCardProps {
    /** 盒子样式 */
    boxStyle?: string
    /** 图标 */
    icon?: string
    /** 图标样式 */
    iconStyle?: string
    /** 标题 */
    title?: string
    /** 数值 */
    count?: number
    /** 已格式化的展示值 */
    displayValue?: string
    /** 小数位 */
    decimals?: number
    /** 分隔符 */
    separator?: string
    /** 描述 */
    description: string
    /** 文本颜色 */
    textColor?: string
    /** 是否显示箭头 */
    showArrow?: boolean
  }

  withDefaults(defineProps<StatsCardProps>(), {
    iconSize: 30,
    iconBgRadius: 50,
    decimals: 0,
    separator: ','
  })
</script>
