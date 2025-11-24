<template>
  <div class="double-layer-radar-container">
    <div class="chart-header" v-if="title">
      <h3>{{ title }}</h3>
    </div>
    <div 
      ref="chartRef" 
      class="double-layer-radar-chart"
      :style="{ width: width, height: height }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface RadarData {
  dimension: string
  score: number
  maxScore: number
  percentage: number
}

interface SubDimensionData {
  parentDimension: string
  subDimension: string
  score: number
  maxScore: number
  percentage: number
}

interface Props {
  mainData: RadarData[]  // 主维度数据（内圈）
  subData?: SubDimensionData[]  // 子维度数据（外圈）
  title?: string
  width?: string
  height?: string
  theme?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '600px',
  theme: 'light'
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 初始化双层雷达图
const initDoubleLayerChart = async () => {
  if (!chartRef.value || !props.mainData || !props.mainData.length) return
  
  await nextTick()
  
  // 销毁已存在的实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  // 准备内圈指标（主维度）
  const innerIndicators = props.mainData.map(item => ({
    name: item.dimension,
    max: 100
  }))
  
  // 准备外圈指标（子维度）
  const outerIndicators: any[] = []
  const subDimensionMap = new Map<string, SubDimensionData[]>()
  
  // 如果有子维度数据，按主维度分组
  if (props.subData && props.subData.length > 0) {
    props.subData.forEach(sub => {
      if (!subDimensionMap.has(sub.parentDimension)) {
        subDimensionMap.set(sub.parentDimension, [])
      }
      subDimensionMap.get(sub.parentDimension)!.push(sub)
    })
    
    // 为每个主维度创建对应数量的外圈指标
    props.mainData.forEach(main => {
      const subs = subDimensionMap.get(main.dimension) || []
      subs.forEach(sub => {
        outerIndicators.push({
          name: sub.subDimension,
          max: 100
        })
      })
    })
  } else {
    // 如果没有子维度数据，创建模拟的子维度
    props.mainData.forEach(main => {
      // 为每个主维度创建3个子维度
      for (let i = 1; i <= 3; i++) {
        outerIndicators.push({
          name: `${main.dimension}子项${i}`,
          max: 100
        })
      }
    })
  }
  
  // 准备数据
  const innerData = props.mainData.map(item => item.percentage)
  
  let outerData: number[] = []
  if (props.subData && props.subData.length > 0) {
    // 按主维度顺序排列子维度数据
    props.mainData.forEach(main => {
      const subs = subDimensionMap.get(main.dimension) || []
      subs.forEach(sub => {
        outerData.push(sub.percentage)
      })
    })
  } else {
    // 模拟子维度数据
    props.mainData.forEach(main => {
      const baseValue = main.percentage
      for (let i = 0; i < 3; i++) {
        const randomValue = Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * 20))
        outerData.push(randomValue)
      }
    })
  }
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesType === 'radar') {
          const seriesName = params.seriesName
          const dataIndex = params.dataIndex
          
          if (seriesName === '主维度能力') {
            const item = props.mainData[dataIndex]
            if (!item) return ''
            return `
              <div style="padding: 8px; font-size: 12px;">
                <strong style="color: #4F46E5;">${item.dimension}</strong><br/>
                得分: ${item.score.toFixed(1)} / ${item.maxScore}<br/>
                得分率: ${item.percentage.toFixed(1)}%
              </div>
            `
          } else if (seriesName === '子维度能力' && props.subData) {
            const item = props.subData[dataIndex]
            if (!item) return ''
            return `
              <div style="padding: 8px; font-size: 12px;">
                <strong style="color: #10B981;">${item.subDimension}</strong><br/>
                所属维度: ${item.parentDimension}<br/>
                得分: ${item.score.toFixed(1)} / ${item.maxScore}<br/>
                得分率: ${item.percentage.toFixed(1)}%
              </div>
            `
          }
        }
        return ''
      }
    },
    legend: {
      show: true,
      bottom: 15,
      itemGap: 30,
      textStyle: {
        fontSize: 13,
        color: '#666'
      },
      data: ['主维度能力', '子维度能力']
    },
    radar: [
      {
        // 内圈雷达图（主维度）
        center: ['50%', '50%'],
        radius: '35%',
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        indicator: innerIndicators,
        
        axisLine: {
          lineStyle: {
            color: 'rgba(79, 70, 229, 0.3)',
            width: 2
          }
        },
        
        splitLine: {
          lineStyle: {
            color: 'rgba(79, 70, 229, 0.2)',
            width: 1
          }
        },
        
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(79, 70, 229, 0.05)',
              'rgba(79, 70, 229, 0.1)',
              'rgba(79, 70, 229, 0.05)',
              'rgba(79, 70, 229, 0.1)'
            ]
          }
        },
        
        axisName: {
          fontSize: 14,
          color: '#333',
          fontWeight: 'bold',
          formatter: (name: string) => {
            if (name.length > 4) {
              return name.substring(0, 4) + '\n' + name.substring(4)
            }
            return name
          }
        },
        
        axisLabel: {
          show: true,
          fontSize: 10,
          color: '#999',
          formatter: (value: number) => value + '%'
        }
      },
      {
        // 外圈雷达图（子维度）
        center: ['50%', '50%'],
        radius: ['45%', '75%'],
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        indicator: outerIndicators,
        
        axisLine: {
          lineStyle: {
            color: 'rgba(16, 185, 129, 0.3)',
            width: 1
          }
        },
        
        splitLine: {
          lineStyle: {
            color: 'rgba(16, 185, 129, 0.15)',
            width: 1
          }
        },
        
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(16, 185, 129, 0.02)',
              'rgba(16, 185, 129, 0.04)',
              'rgba(16, 185, 129, 0.02)',
              'rgba(16, 185, 129, 0.04)'
            ]
          }
        },
        
        axisName: {
          fontSize: 11,
          color: '#666',
          fontWeight: 'normal',
          formatter: (name: string) => {
            if (name.length > 6) {
              const mid = Math.ceil(name.length / 2)
              return name.substring(0, mid) + '\n' + name.substring(mid)
            }
            return name
          }
        },
        
        axisLabel: {
          show: false
        }
      }
    ],
    
    series: [
      {
        name: '主维度能力',
        type: 'radar',
        radarIndex: 0,
        data: [
          {
            value: innerData,
            name: '主维度能力',
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              color: '#4F46E5',
              width: 4
            },
            areaStyle: {
              color: 'rgba(79, 70, 229, 0.3)'
            },
            itemStyle: {
              color: '#4F46E5',
              borderColor: '#fff',
              borderWidth: 3
            }
          }
        ]
      },
      {
        name: '子维度能力',
        type: 'radar',
        radarIndex: 1,
        data: [
          {
            value: outerData,
            name: '子维度能力',
            symbol: 'diamond',
            symbolSize: 5,
            lineStyle: {
              color: '#10B981',
              width: 2
            },
            areaStyle: {
              color: 'rgba(16, 185, 129, 0.15)'
            },
            itemStyle: {
              color: '#10B981',
              borderColor: '#fff',
              borderWidth: 2
            }
          }
        ]
      }
    ],
    
    // 动画配置
    animationDuration: 2000,
    animationEasing: 'cubicOut' as const,
    animationDelay: (idx: number) => idx * 50
  }
  
  // 深色主题适配
  if (props.theme === 'dark') {
    if (option.radar[0]?.axisName) option.radar[0].axisName.color = '#fff'
    if (option.radar[1]?.axisName) option.radar[1].axisName.color = '#ccc'
    if (option.legend?.textStyle) option.legend.textStyle.color = '#ccc'
  }
  
  chartInstance.setOption(option)
  
  // 响应式处理
  const handleResize = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }
  
  window.addEventListener('resize', handleResize)
  
  // 组件卸载时移除监听器
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
}

// 获取图表图片
const getChartImage = () => {
  if (!chartInstance) return ''
  return chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })
}

// 暴露方法给父组件
defineExpose({
  getChartImage
})

// 监听数据变化
watch(() => [props.mainData, props.subData], () => {
  initDoubleLayerChart()
}, { deep: true })

// 监听主题变化
watch(() => props.theme, () => {
  initDoubleLayerChart()
})

onMounted(() => {
  initDoubleLayerChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped>
.double-layer-radar-container {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chart-header {
  text-align: center;
  margin-bottom: 24px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #4F46E5, #7C3AED, #10B981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.double-layer-radar-chart {
  min-height: 500px;
}

/* 深色主题 */
.double-layer-radar-container.dark {
  background: #1f2937;
  border-color: rgba(255, 255, 255, 0.1);
}

.double-layer-radar-container.dark .chart-header h3 {
  color: #fff;
  -webkit-text-fill-color: #fff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .double-layer-radar-container {
    padding: 20px;
  }
  
  .chart-header h3 {
    font-size: 20px;
  }
  
  .double-layer-radar-chart {
    min-height: 450px;
  }
}

@media (max-width: 480px) {
  .double-layer-radar-container {
    padding: 16px;
  }
  
  .chart-header h3 {
    font-size: 18px;
  }
  
  .double-layer-radar-chart {
    min-height: 400px;
  }
}
</style>