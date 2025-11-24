<template>
  <div class="lcp-test-view">
    <h1>Leadership Circle Profile Test</h1>
    <div class="chart-wrapper">
      <LeadershipCircleProfile :data="chartData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LeadershipCircleProfile from '../components/LeadershipCircleProfile.vue';

const chartData = ref({
  // 上半圆：创造性能力 (Creative)
  creative: [
    {
      dimension: "关系 (Relating)",
      color: "#7FB069", // 绿色系
      traits: [
        { name: "关爱 (Caring)", self: 85, others: 80 },
        { name: "辅导与培养 (Mentoring)", self: 70, others: 75 },
        { name: "人际交往智慧 (Interpersonal)", self: 65, others: 70 },
        { name: "协作者 (Collaborator)", self: 80, others: 85 },
        { name: "培养团队 (Teamwork)", self: 75, others: 80 }
      ]
    },
    {
      dimension: "自我觉察 (Self-Awareness)",
      color: "#5B9EA6", // 蓝绿色系
      traits: [
        { name: "无私的领导者 (Selfless)", self: 90, others: 88 },
        { name: "平衡 (Balance)", self: 60, others: 50 },
        { name: "沉着 (Composure)", self: 70, others: 75 },
        { name: "学习者 (Learner)", self: 85, others: 82 }
      ]
    },
    {
      dimension: "本真 (Authenticity)",
      color: "#2E8B57", // 深绿色
      traits: [
        { name: "正直 (Integrity)", self: 95, others: 90 },
        { name: "勇敢真实 (Courageous)", self: 80, others: 75 }
      ]
    },
    {
      dimension: "系统意识 (Systems Awareness)",
      color: "#8FBC8F", 
      traits: [
        { name: "关心社会 (Community)", self: 70, others: 65 },
        { name: "持续性产出 (Sustainable)", self: 75, others: 78 },
        { name: "系统思考者 (Systems Thinker)", self: 80, others: 82 }
      ]
    },
    {
      dimension: "成就 (Achievement)",
      color: "#DAA520", // 金色/橙色系
      traits: [
        { name: "战略关注 (Strategic)", self: 60, others: 55 },
        { name: "使命与愿景 (Purposeful)", self: 85, others: 80 },
        { name: "取得成果 (Achieves)", self: 90, others: 92 },
        { name: "决断力 (Decisiveness)", self: 88, others: 85 }
      ]
    }
  ],
  
  // 下半圆：反应性倾向 (Reactive)
  reactive: [
    {
      dimension: "控制 (Controlling)",
      color: "#A0522D", // 赭石/褐色系
      traits: [
        { name: "完美 (Perfect)", self: 40, others: 50 },
        { name: "野心 (Driven)", self: 60, others: 65 },
        { name: "工作狂 (Ambition)", self: 50, others: 60 }, 
        { name: "专制 (Autocratic)", self: 20, others: 30 }
      ]
    },
    {
      dimension: "防卫 (Protecting)",
      color: "#808080", // 灰色系
      traits: [
        { name: "傲慢 (Arrogance)", self: 15, others: 25 },
        { name: "挑剔 (Critical)", self: 30, others: 40 },
        { name: "距离感 (Distance)", self: 45, others: 50 }
      ]
    },
    {
      dimension: "顺从 (Complying)",
      color: "#BDB76B", // 卡其色/土黄色系
      traits: [
        { name: "被动 (Passive)", self: 20, others: 25 },
        { name: "归属 (Belonging)", self: 50, others: 55 },
        { name: "取悦 (Pleasing)", self: 60, others: 70 },
        { name: "保守 (Conservative)", self: 35, others: 40 }
      ]
    }
  ]
});
</script>

<style scoped>
.lcp-test-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-wrapper {
  width: 800px;
  height: 800px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
}
</style>
