<!-- 柱状图 -->
<template>
  <div ref="chartRef" :style="{ height: props.height }" v-loading="props.loading"> </div>
</template>

<script setup lang="ts">
  import { useChartOps, useChartComponent } from '@/hooks/core/useChart'
  import { getCssVar } from '@/utils/ui'
  import { graphic, type EChartsOption } from '@/plugins/echarts'
  import type { BarChartProps, BarDataItem } from '@/types/component/chart'
  import { formatChartValue } from '@/utils/number'

  defineOptions({ name: 'ArtBarChart' })

  const props = withDefaults(defineProps<BarChartProps>(), {
    // 基础配置
    height: useChartOps().chartHeight,
    loading: false,
    isEmpty: false,
    colors: () => useChartOps().colors,
    borderRadius: 4,

    // 数据配置
    data: () => [0, 0, 0, 0, 0, 0, 0],
    xAxisData: () => [],
    barWidth: '40%',
    stack: false,

    // 轴线显示配置
    showAxisLabel: true,
    showAxisLine: true,
    showSplitLine: true,

    // 交互配置
    showTooltip: true,
    showLegend: false,
    legendPosition: 'bottom'
  })

  // 判断是否为多数据
  const isMultipleData = computed(() => {
    return (
      Array.isArray(props.data) &&
      props.data.length > 0 &&
      typeof props.data[0] === 'object' &&
      'name' in props.data[0]
    )
  })

  // 获取颜色配置
  const getColor = (customColor?: string, index?: number) => {
    if (customColor) return customColor

    if (index !== undefined) {
      return props.colors![index % props.colors!.length]
    }

    // 默认渐变色
    return new graphic.LinearGradient(0, 0, 0, 1, [
      {
        offset: 0,
        color: getCssVar('--el-color-primary-light-4')
      },
      {
        offset: 1,
        color: getCssVar('--el-color-primary')
      }
    ])
  }

  // 创建渐变色
  const createGradientColor = (color: string) => {
    return new graphic.LinearGradient(0, 0, 0, 1, [
      {
        offset: 0,
        color: color
      },
      {
        offset: 1,
        color: color
      }
    ])
  }

  /**
   * 生成柱形的基础样式配置
   * @param color 柱形颜色或渐变配置
   * @returns ECharts 柱形样式
   */
  const getBaseItemStyle = (
    color: string | InstanceType<typeof graphic.LinearGradient> | undefined
  ) => ({
    borderRadius: props.borderRadius,
    borderColor: props.borderColor,
    borderWidth: props.borderWidth,
    color: typeof color === 'string' ? createGradientColor(color) : color
  })

  // 创建系列配置
  const createSeriesItem = (config: {
    name?: string
    data: number[]
    color?: string | InstanceType<typeof graphic.LinearGradient>
    barWidth?: string | number
    stack?: string
  }) => {
    const animationConfig = getAnimationConfig()

    return {
      name: config.name,
      data: config.data,
      type: 'bar' as const,
      stack: config.stack,
      itemStyle: getBaseItemStyle(config.color),
      barWidth: config.barWidth || props.barWidth,
      ...animationConfig
    }
  }

  // 使用新的图表组件抽象
  const {
    chartRef,
    getAxisLineStyle,
    getAxisLabelStyle,
    getAxisTickStyle,
    getSplitLineStyle,
    getAnimationConfig,
    getTooltipStyle,
    getLegendStyle,
    getGridWithLegend
  } = useChartComponent({
    props,
    /** 检查柱状系列是否缺少数据项；零值仍交给图表渲染。@returns 是否为空数据 */
    checkEmpty: () => {
      // 检查单数据情况
      if (Array.isArray(props.data) && typeof props.data[0] === 'number') {
        const singleData = props.data as number[]
        return !singleData.length
      }

      // 检查多数据情况
      if (Array.isArray(props.data) && typeof props.data[0] === 'object') {
        const multiData = props.data as BarDataItem[]
        return !multiData.length || multiData.every((item) => !item.data?.length)
      }

      return true
    },
    watchSources: [() => props.data, () => props.xAxisData, () => props.colors],
    /** 生成柱状图配置。@returns ECharts 柱状图配置 */
    generateOptions: (): EChartsOption => {
      const options: EChartsOption = {
        grid: getGridWithLegend(props.showLegend && isMultipleData.value, props.legendPosition, {
          top: 15,
          right: 0,
          left: 0
        }),
        tooltip: props.showTooltip
          ? {
              ...getTooltipStyle(),
              valueFormatter:
                props.valuePrefix || props.valuePrecision !== undefined
                  ? (value: unknown) =>
                      formatChartValue(Number(value), props.valuePrefix, props.valuePrecision)
                  : undefined
            }
          : undefined,
        xAxis: {
          type: 'category',
          data: props.xAxisData,
          axisTick: { ...getAxisTickStyle(true), alignWithLabel: true },
          axisLine: getAxisLineStyle(props.showAxisLine, true),
          axisLabel: getAxisLabelStyle(props.showAxisLabel, true)
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            ...getAxisLabelStyle(props.showAxisLabel),
            formatter:
              props.valuePrecision !== undefined
                ? (value: number) =>
                    formatChartValue(value, props.valuePrefix, props.valuePrecision)
                : undefined
          },
          axisLine: getAxisLineStyle(false),
          splitLine: getSplitLineStyle(props.showSplitLine)
        }
      }

      // 添加图例配置
      if (props.showLegend && isMultipleData.value) {
        options.legend = getLegendStyle(props.legendPosition, {
          itemStyle: {
            borderWidth: 0
          }
        })
      }

      // 生成系列数据
      if (isMultipleData.value) {
        const multiData = props.data as BarDataItem[]
        options.series = multiData.map((item, index) => {
          const computedColor = getColor(props.colors[index], index)

          return createSeriesItem({
            name: item.name,
            data: item.data,
            color: computedColor,
            barWidth: item.barWidth,
            stack: props.stack ? item.stack || 'total' : undefined
          })
        })
      } else {
        // 单数据情况
        const singleData = props.data as number[]
        const computedColor = getColor()

        options.series = [
          createSeriesItem({
            data: singleData,
            color: computedColor
          })
        ]
      }

      return options
    }
  })
</script>
