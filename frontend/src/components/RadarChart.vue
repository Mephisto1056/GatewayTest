<template>
  <div class="radar-chart-container">
    <div class="chart-header" v-if="title">
      <h3>{{ title }}</h3>
    </div>
    <div 
      ref="chartRef" 
      class="radar-chart"
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

interface Props {
  data: RadarData[]
  title?: string
  width?: string
  height?: string
  theme?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '400px',
  theme: 'light'
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 初始化图表
const initChart = async () => {
  if (!chartRef.value || !props.data.length) return
  
  await nextTick()
  
  // 销毁已存在的实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  // 准备雷达图配置
  const indicators = props.data.map(item => ({
    name: item.dimension,
    max: 100, // 使用百分比作为最大值
    axisLabel: {
      show: true,
      fontSize: 12,
      color: '#666'
    }
  }))
  
  const seriesData = [props.data.map(item => item.percentage)]
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const dataIndex = params.dataIndex
        const item = props.data[dataIndex]
        if (!item) return ''
        return `
          <div style="padding: 8px;">
            <strong>${item.dimension}</strong><br/>
            得分: ${item.score.toFixed(1)} / ${item.maxScore}<br/>
            得分率: ${item.percentage.toFixed(1)}%
          </div>
        `
      }
    },
    legend: {
      show: false
    },
    radar: {
      // 雷达图的基本配置
      center: ['50%', '50%'],
      radius: '70%',
      startAngle: 90,
      splitNumber: 5,
      shape: 'polygon',
      
      // 指标配置
      indicator: indicators,
      
      // 坐标轴配置
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      
      // 分割线配置
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)',
          width: 1,
          type: 'solid'
        }
      },
      
      // 分割区域配置
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(114, 172, 209, 0.05)',
            'rgba(114, 172, 209, 0.1)',
            'rgba(114, 172, 209, 0.05)',
            'rgba(114, 172, 209, 0.1)',
            'rgba(114, 172, 209, 0.05)'
          ]
        }
      },
      
      // 指标名称配置
      axisName: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
        formatter: (name: string) => {
          // 如果名称太长，进行换行处理
          if (name.length > 4) {
            return name.substring(0, 4) + '\n' + name.substring(4)
          }
          return name
        }
      },
      
      // 刻度标签配置
      axisLabel: {
        show: true,
        fontSize: 10,
        color: '#999',
        formatter: (value: number) => {
          return value + '%'
        }
      }
    },
    
    series: [
      {
        name: '能力评估',
        type: 'radar',
        data: [
          {
            value: seriesData[0],
            name: '当前能力',
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#4F46E5',
              width: 3
            },
            areaStyle: {
              color: 'rgba(79, 70, 229, 0.2)'
            },
            itemStyle: {
              color: '#4F46E5',
              borderColor: '#fff',
              borderWidth: 2
            }
          }
        ]
      }
    ],
    
    // 动画配置
    animationDuration: 1000,
    animationEasing: 'cubicOut' as const
  }
  
  // 如果是深色主题，调整颜色
  if (props.theme === 'dark') {
    option.radar.axisName.color = '#fff'
    option.radar.axisLabel.color = '#ccc'
    option.radar.axisLine.lineStyle.color = 'rgba(255, 255, 255, 0.2)'
    option.radar.splitLine.lineStyle.color = 'rgba(255, 255, 255, 0.2)'
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
watch(() => props.data, () => {
  initChart()
}, { deep: true })

// 监听主题变化
watch(() => props.theme, () => {
  initChart()
})

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped>
.radar-chart-container {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-header {
  text-align: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.radar-chart {
  min-height: 300px;
}

/* 深色主题 */
.radar-chart-container.dark {
  background: #1f2937;
}

.radar-chart-container.dark .chart-header h3 {
  color: #fff;
}
</style>