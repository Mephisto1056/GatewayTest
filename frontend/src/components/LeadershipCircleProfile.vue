<template>
  <div ref="chartContainer" class="lcp-chart-container">
    <svg ref="svgRef"></svg>
    <div v-if="tooltip.visible" class="tooltip" :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-content">
        <div>Self: {{ tooltip.self }}%</div>
        <div>Others: {{ tooltip.others }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as d3 from 'd3';

interface Trait {
  name: string;
  self: number;
  others: number;
}

interface Dimension {
  dimension: string;
  color: string;
  traits: Trait[];
}

interface ChartData {
  creative: Dimension[];
  reactive: Dimension[];
}

const props = defineProps<{
  data: ChartData;
}>();

const chartContainer = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const tooltip = ref({ visible: false, x: 0, y: 0, title: '', self: 0, others: 0 });

let resizeObserver: ResizeObserver | null = null;

const drawChart = () => {
  if (!chartContainer.value || !svgRef.value || !props.data) return;

  const containerWidth = chartContainer.value.clientWidth;
  const width = containerWidth;
  const height = containerWidth; // Keep it square
  // Margin for the outer rings (Sub-dimension labels) and Sunburst ring
  const margin = 120;
  const radius = Math.min(width, height) / 2 - margin;
  // Radius definitions
  const innerRingInnerR = radius + 10;
  const innerRingOuterR = radius + 40;
  const outerRingOuterR = radius + 90;
  const labelRadius = radius + 100;

  const svg = d3.select(svgRef.value);
  svg.selectAll('*').remove();

  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('max-width', '100%')
    .style('height', 'auto');

  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

  // --- Data Preparation ---
  
  // Flatten traits with angle information
  // Creative: -90 deg to +90 deg (Upper Half)
  // Reactive: +90 deg to +270 deg (Lower Half)
  
  interface ProcessedTrait extends Trait {
    dimension: string;
    color: string;
    angle: number;
    type: 'creative' | 'reactive';
    value?: number; // Add value for line generator
  }

  const creativeTraits: ProcessedTrait[] = [];
  const reactiveTraits: ProcessedTrait[] = [];

  // Calculate total items to determine angle steps
  const totalCreative = props.data.creative.reduce((sum, d) => sum + d.traits.length, 0);
  const totalReactive = props.data.reactive.reduce((sum, d) => sum + d.traits.length, 0);

  const creativeStep = Math.PI / totalCreative;
  const reactiveStep = Math.PI / totalReactive;

  let currentAngle = -Math.PI / 2; // Start at top (-90 deg)

  // Process Creative (Upper Half)
  props.data.creative.forEach(dim => {
    dim.traits.forEach(t => {
      // Center the point in the slice
      const angle = currentAngle + creativeStep / 2;
      creativeTraits.push({
        ...t,
        dimension: dim.dimension,
        color: dim.color,
        angle: angle,
        type: 'creative'
      });
      currentAngle += creativeStep;
    });
  });

  currentAngle = Math.PI / 2; // Start at bottom (+90 deg)

  // Process Reactive (Lower Half)
  props.data.reactive.forEach(dim => {
    dim.traits.forEach(t => {
       const angle = currentAngle + reactiveStep / 2;
       reactiveTraits.push({
         ...t,
         dimension: dim.dimension,
         color: dim.color,
         angle: angle,
         type: 'reactive'
       });
       currentAngle += reactiveStep;
    });
  });

  const allTraits = [...creativeTraits, ...reactiveTraits];

  // Scales
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  // --- 1. Draw Grid ---
  const gridLevels = [20, 40, 60, 67, 80, 100];
  const gridGroup = g.append('g').attr('class', 'grid');

  gridLevels.forEach(level => {
    const isSpecial = level === 67;
    gridGroup.append('circle')
      .attr('r', rScale(level))
      .attr('fill', 'none')
      .attr('stroke', isSpecial ? '#333' : '#e0e0e0')
      .attr('stroke-width', isSpecial ? 2 : 1)
      .attr('stroke-dasharray', isSpecial ? '4 4' : 'none');

    // Add Labels for grid
    if (level === 100 || level === 67) {
      gridGroup.append('text')
        .attr('x', 4)
        .attr('y', -rScale(level))
        .text(level + '%')
        .attr('font-size', '10px')
        .attr('fill', isSpecial ? '#333' : '#999')
        .attr('alignment-baseline', 'middle');
    }
  });

  // Draw radial grid (lines between all traits/sub-dimensions)
  const drawRadialGrid = (dimensions: Dimension[], step: number, startAngleOffset: number) => {
      let currentIdx = 0;
      dimensions.forEach(dim => {
          const count = dim.traits.length;
          
          for(let i=0; i < count; i++) {
             // We only need to draw the start line for each trait.
             const angle = startAngleOffset + (currentIdx + i) * step;
             
             // Is this a main dimension boundary? (i === 0)
             const isMainBoundary = (i === 0);
             
             // Boundary lines go up to innerRingOuterR for main boundaries
             // For sub-trait boundaries, they go to radius
             const lineRadius = isMainBoundary ? innerRingOuterR : radius;
             
             const x = Math.cos(angle - Math.PI / 2) * lineRadius;
             const y = Math.sin(angle - Math.PI / 2) * lineRadius;
             
             g.append('line')
                .attr('x1', 0).attr('y1', 0)
                .attr('x2', x).attr('y2', y)
                .attr('stroke', isMainBoundary ? '#fff' : '#eee')
                .attr('stroke-width', isMainBoundary ? 2 : 1)
                .attr('stroke-dasharray', isMainBoundary ? 'none' : '2 2');
          }

          currentIdx += count;
          
          // Draw final line for the very last element in the group
           if (dim === dimensions[dimensions.length - 1]) {
             const endAngle = startAngleOffset + currentIdx * step;
             const x = Math.cos(endAngle - Math.PI / 2) * innerRingOuterR;
             const y = Math.sin(endAngle - Math.PI / 2) * innerRingOuterR;
             
             g.append('line')
                .attr('x1', 0).attr('y1', 0)
                .attr('x2', x).attr('y2', y)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
           }
      });
  };
  
  drawRadialGrid(props.data.creative, creativeStep, -Math.PI/2);
  drawRadialGrid(props.data.reactive, reactiveStep, Math.PI/2);

  // --- 2. Layer 1 (Inner): Main Dimensions (Sunburst Ring) ---
  // Defined at top level now: innerRingInnerR, innerRingOuterR

  const drawMainDimensions = (dimensions: Dimension[], step: number, startAngleOffset: number) => {
      let currentIdx = 0;
      
      dimensions.forEach(dim => {
          const count = dim.traits.length;
          const startAngle = startAngleOffset + currentIdx * step;
          const endAngle = startAngle + count * step;
          
          // Sunburst Ring Segment (Solid Color)
          const ringArc = d3.arc()
            .innerRadius(innerRingInnerR)
            .outerRadius(innerRingOuterR)
            .startAngle(startAngle)
            .endAngle(endAngle);
            
          g.append('path')
             .attr('d', ringArc as any)
             .attr('fill', dim.color)
             .attr('stroke', 'white')
             .attr('stroke-width', 1.5);
             
          // Label
          const midAngle = (startAngle + endAngle) / 2;
          const textRadius = (innerRingInnerR + innerRingOuterR) / 2;
          const tx = Math.cos(midAngle - Math.PI / 2) * textRadius;
          const ty = Math.sin(midAngle - Math.PI / 2) * textRadius;
          
          let rotate = (midAngle * 180 / Math.PI);
          if (rotate > 90) rotate -= 180;
          if (rotate < -90) rotate += 180;
          
          g.append('text')
            .attr('transform', `translate(${tx}, ${ty}) rotate(${rotate})`)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text(dim.dimension || '')
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none');

          currentIdx += count;
      });
  };

  // --- 2.5 Layer 2 (Outer): Sub-dimensions Arcs (Sunburst Outer Ring) ---
  
  const drawSubDimensionArcs = (traits: ProcessedTrait[], step: number) => {
      traits.forEach(t => {
        const startAngle = t.angle - step / 2;
        const endAngle = t.angle + step / 2;
        
        const arc = d3.arc()
            .innerRadius(innerRingOuterR + 2) // Slight gap from inner ring
            .outerRadius(outerRingOuterR)
            .startAngle(startAngle)
            .endAngle(endAngle);
        
        g.append('path')
          .attr('d', arc as any)
          .attr('fill', t.color)
          .attr('opacity', 0.6)
          .attr('stroke', 'white')
          .attr('stroke-width', 1);
      });
  };

  drawMainDimensions(props.data.creative, creativeStep, -Math.PI/2);
  drawSubDimensionArcs(creativeTraits, creativeStep);
  
  drawMainDimensions(props.data.reactive, reactiveStep, Math.PI/2);
  drawSubDimensionArcs(reactiveTraits, reactiveStep);

  // --- 3. Layer 3 (Outer): Sub-dimensions Labels ---
  // Defined at top: labelRadius
  
  const drawTraitLabels = (traits: ProcessedTrait[]) => {
      traits.forEach(t => {
          const x = Math.cos(t.angle - Math.PI / 2) * labelRadius;
          const y = Math.sin(t.angle - Math.PI / 2) * labelRadius;
          
          let rotate = (t.angle * 180 / Math.PI);
          let anchor = 'start';
          
          // Adjust rotation for readability
          // Right side: -90 to 90. Left side: 90 to 270 (or -90 to -270)
          // D3 angles: -PI/2 (top) -> 0 (right) -> PI/2 (bottom)
          
          // Normalize angle to 0-360 for easier logic if needed, but standard check:
          // Left side is when angle > PI/2 or angle < -PI/2
          const isLeftSide = t.angle > Math.PI/2 || t.angle < -Math.PI/2;
          
          if (isLeftSide) {
              rotate -= 180;
              anchor = 'end';
          }
          
          const group = g.append('g')
            .attr('transform', `translate(${x}, ${y})`);
            
          group.append('text')
            .attr('transform', `rotate(${rotate})`)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')
            .text(t.name || '')
            .attr('fill', '#666')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .style('cursor', 'default')
            .append('title').text(t.name);
            
       });
   };

  drawTraitLabels(allTraits);

  // --- 4. Data Lines ---
  
  const lineGenerator = d3.lineRadial<ProcessedTrait>()
    .angle(d => d.angle)
    .radius(d => rScale(d.value || 0)) // Handle missing values
    .curve(d3.curveLinearClosed); // Closed curve for full circle

  // Prepare data for lines
  // We need to construct arrays that form a full loop if we want closed curve.
  // `allTraits` is constructed top (-90) -> clockwise -> bottom -> clockwise -> top.
  // However, we constructed Creative (-90 to 90) then Reactive (90 to 270).
  // This forms a continuous circle.
  
  const selfData = allTraits.map(t => ({ ...t, value: t.self }));
  const othersData = allTraits.map(t => ({ ...t, value: t.others }));

  // Draw Others (Dotted Line)
  g.append('path')
    .datum(othersData)
    .attr('d', lineGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#333') // Dark
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4 4') // Dotted
    .attr('opacity', 0.8);

  // Draw Self (Solid Line)
  g.append('path')
    .datum(selfData)
    .attr('d', lineGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#000') // Darker
    .attr('stroke-width', 3);

  // Draw Points & Tooltips
  const drawPoints = (data: any[], type: 'self' | 'others') => {
      g.selectAll(`.point-${type}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => Math.cos(d.angle - Math.PI/2) * rScale(d.value))
        .attr('cy', d => Math.sin(d.angle - Math.PI/2) * rScale(d.value))
        .attr('r', type === 'self' ? 4 : 3)
        .attr('fill', d => type === 'self' ? d.color : '#333') // Self points colored, others dark
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseover', (event, d) => {
            tooltip.value = {
                visible: true,
                x: event.pageX + 10,
                y: event.pageY + 10,
                title: d.name,
                self: d.self,
                others: d.others
            };
            d3.select(event.currentTarget).attr('r', 6);
        })
        .on('mouseout', (event) => {
            tooltip.value.visible = false;
            d3.select(event.currentTarget).attr('r', type === 'self' ? 4 : 3);
        });
  };

  drawPoints(othersData, 'others');
  drawPoints(selfData, 'self');
};

onMounted(() => {
  drawChart();
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => drawChart());
    resizeObserver.observe(chartContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

watch(() => props.data, drawChart, { deep: true });

const getChartImage = async (): Promise<string> => {
  if (!svgRef.value) return '';
  return new Promise((resolve) => {
    const svgElement = svgRef.value!;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const width = svgElement.clientWidth || 500;
    const height = svgElement.clientHeight || 500;
    canvas.width = width * 2;
    canvas.height = height * 2;
    if (ctx) {
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else resolve('');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
};

defineExpose({ getChartImage });
</script>

<style scoped>
.lcp-chart-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
}

.tooltip {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 1000;
  font-size: 12px;
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}
</style>
