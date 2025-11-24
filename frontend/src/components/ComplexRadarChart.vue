<template>
  <div class="complex-radar-container">
    <div class="chart-header" v-if="title">
      <h3>{{ title }}</h3>
    </div>
    <div 
      ref="chartRef" 
      class="complex-radar-chart"
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
  showMultiLayers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '500px',
  theme: 'light',
  showMultiLayers: true
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 初始化复杂雷达图
const initComplexChart = async () => {
  if (!chartRef.value || !props.data.length) return
  
  await nextTick()
  
  // 销毁已存在的实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  // 准备多层雷达图配置
  const indicators = props.data.map(item => ({
    name: item.dimension,
    max: 100,
    axisLabel: {
      show: true,
      fontSize: 11,
      color: '#666',
      formatter: '{value}%'
    }
  }))
  
  // 当前数据
  const currentData = props.data.map(item => item.percentage)
  
  // 目标数据（假设为80%）
  const targetData = props.data.map(() => 80)
  
  // 平均数据（假设为60%）
  const averageData = props.data.map(() => 60)
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesType === 'radar') {
          const dataIndex = params.dataIndex
          const item = props.data[dataIndex]
          if (!item) return ''
          
          let content = `<div style="padding: 8px; font-size: 12px;">`
          content += `<strong style="color: #333;">${item.dimension}</strong><br/>`
          content += `<div style="margin: 4px 0;">`
          content += `<span style="color: #4F46E5;">● 当前得分:</span> ${item.score.toFixed(1)} / ${item.maxScore}<br/>`
          content += `<span style="color: #4F46E5;">● 得分率:</span> ${item.percentage.toFixed(1)}%<br/>`
          content += `<span style="color: #10B981;">● 目标得分率:</span> 80%<br/>`
          content += `<span style="color: #F59E0B;">● 平均得分率:</span> 60%`
          content += `</div></div>`
          return content
        }
        return ''
      }
    },
    legend: {
      show: true,
      bottom: 10,
      itemGap: 20,
      textStyle: {
        fontSize: 12,
        color: '#666'
      },
      data: ['当前能力', '目标水平', '平均水平']
    },
    radar: {
      center: ['50%', '50%'],
      radius: '65%',
      startAngle: 90,
      splitNumber: 5,
      shape: 'polygon',
      
      indicator: indicators,
      
      // 坐标轴线
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.15)',
          width: 1
        }
      },
      
      // 分割线 - 创建多层同心圆效果
      splitLine: {
        lineStyle: {
          color: [
            'rgba(79, 70, 229, 0.1)',
            'rgba(79, 70, 229, 0.15)',
            'rgba(79, 70, 229, 0.2)',
            'rgba(79, 70, 229, 0.25)',
            'rgba(79, 70, 229, 0.3)'
          ],
          width: 1,
          type: 'solid'
        }
      },
      
      // 分割区域 - 创建渐变填充效果
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(79, 70, 229, 0.02)',
            'rgba(79, 70, 229, 0.04)',
            'rgba(79, 70, 229, 0.06)',
            'rgba(79, 70, 229, 0.08)',
            'rgba(79, 70, 229, 0.1)'
          ]
        }
      },
      
      // 指标名称样式
      axisName: {
        fontSize: 13,
        color: '#333',
        fontWeight: 'bold',
        formatter: (name: string) => {
          // 处理长文本换行
          if (name.length > 5) {
            const mid = Math.ceil(name.length / 2)
            return name.substring(0, mid) + '\n' + name.substring(mid)
          }
          return name
        }
      },
      
      // 刻度标签
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
        name: '当前能力',
        type: 'radar',
        data: [
          {
            value: currentData,
            name: '当前能力',
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#4F46E5',
              width: 3,
              type: 'solid'
            },
            areaStyle: {
              color: 'rgba(79, 70, 229, 0.25)'
            },
            itemStyle: {
              color: '#4F46E5',
              borderColor: '#fff',
              borderWidth: 2
            }
          }
        ]
      },
      {
        name: '目标水平',
        type: 'radar',
        data: [
          {
            value: targetData,
            name: '目标水平',
            symbol: 'diamond',
            symbolSize: 5,
            lineStyle: {
              color: '#10B981',
              width: 2,
              type: 'dashed'
            },
            areaStyle: {
              color: 'rgba(16, 185, 129, 0.1)'
            },
            itemStyle: {
              color: '#10B981',
              borderColor: '#fff',
              borderWidth: 1
            }
          }
        ]
      },
      {
        name: '平均水平',
        type: 'radar',
        data: [
          {
            value: averageData,
            name: '平均水平',
            symbol: 'triangle',
            symbolSize: 4,
            lineStyle: {
              color: '#F59E0B',
              width: 2,
              type: 'dotted'
            },
            areaStyle: {
              color: 'rgba(245, 158, 11, 0.1)'
            },
            itemStyle: {
              color: '#F59E0B',
              borderColor: '#fff',
              borderWidth: 1
            }
          }
        ]
      }
    ],
    
    // 动画配置
    animationDuration: 1500,
    animationEasing: 'cubicOut' as const,
    animationDelay: (idx: number) => idx * 100
  }
  
  // 深色主题适配
  if (props.theme === 'dark') {
    option.radar.axisName.color = '#fff'
    option.radar.axisLabel.color = '#ccc'
    option.radar.axisLine.lineStyle.color = 'rgba(255, 255, 255, 0.2)'
    option.legend.textStyle.color = '#ccc'
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

// 监听数据变化
watch(() => props.data, () => {
  initComplexChart()
}, { deep: true })

// 监听主题变化
watch(() => props.theme, () => {
  initComplexChart()
})

onMounted(() => {
  initComplexChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped>
.complex-radar-container {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chart-header {
  text-align: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.complex-radar-chart {
  min-height: 400px;
}

/* 深色主题 */
.complex-radar-container.dark {
  background: #1f2937;
  border-color: rgba(255, 255, 255, 0.1);
}

.complex-radar-container.dark .chart-header h3 {
  color: #fff;
  -webkit-text-fill-color: #fff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .complex-radar-container {
    padding: 16px;
  }
  
  .chart-header h3 {
    font-size: 18px;
  }
  
  .complex-radar-chart {
    min-height: 350px;
  }
}
</style>