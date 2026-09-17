<template>
  <div ref="container" class="daily-chart">
    <div class="legend" aria-label="Series del gráfico">
      <button v-for="(label, index) in labels" :key="label" type="button"
        :aria-pressed="visible[index]" @click="visible[index] = !visible[index]">
        <i :class="['swatch', `series-${index}`]"></i>{{ label }}
        <small>{{ index ? 'eje derecho' : 'eje izquierdo' }}</small>
      </button>
    </div>
    <div class="plot" @pointerleave="active = null">
      <svg :viewBox="`0 0 ${width} 260`" role="group" aria-label="Evolución diaria, dos escalas independientes">
        <g v-for="i in 5" :key="i" class="grid">
          <line :x1="left" :x2="right" :y1="yTick(i)" :y2="yTick(i)" />
          <text :x="left - 8" :y="yTick(i) + 4" text-anchor="end">{{ number(maxima[0] * (5 - i) / 4) }}</text>
          <text :x="right + 8" :y="yTick(i) + 4">{{ number(maxima[1] * (5 - i) / 4) }}</text>
        </g>
        <template v-for="(_, series) in labels" :key="series">
          <path v-if="visible[series]" :class="['line', `series-${series}`]" :d="path(series)" />
          <circle v-if="visible[series] && points.length === 1" :class="`series-${series}`"
            :cx="points[0].x" :cy="y(points[0], series)" r="4" />
        </template>
        <g v-if="selected" aria-hidden="true">
          <line class="crosshair" :x1="selected.x" :x2="selected.x" y1="20" y2="220" />
          <template v-for="(_, series) in labels" :key="series">
            <circle v-if="visible[series]" :class="`series-${series}`" :cx="selected.x" :cy="y(selected, series)" r="5" />
          </template>
        </g>
        <text v-for="tick in ticks" :key="tick.date" :x="tick.x" y="247" :text-anchor="tick.anchor">{{ dateLabel(tick.date) }}</text>
        <rect v-for="(point, index) in points" :key="point.date" class="hit"
          :x="hitStart(index)" y="16" :width="hitEnd(index) - hitStart(index)" height="210"
          tabindex="0" role="button" :aria-label="pointLabel(point)"
          @pointerenter="active = index" @pointerdown="active = index"
          @focus="active = index" @blur="active = null" @keydown.esc="active = null" />
      </svg>
    </div>
    <div class="detail" aria-live="polite">
      <template v-if="selected">
        <strong>{{ dateLabel(selected.date, true) }}</strong>
        <span v-for="(label, index) in labels" :key="label"><i :class="['swatch', `series-${index}`]"></i>{{ label }}: <b>{{ number(selected.values[index]) }}</b></span>
        <span v-if="selected.extra">{{ selected.extra }}</span>
      </template>
      <span v-else class="hint">Pasa el cursor, toca un día o usa Tab para consultar los valores. Cada serie utiliza su propio eje.</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  rows: { type: Array, required: true },
  labels: { type: Array, required: true },
});
const container = ref(null);
const width = ref(600);
const visible = ref([true, true]);
const active = ref(null);
let observer;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(120, Math.floor(entry.contentRect.width)); });
  observer.observe(container.value);
});
onUnmounted(() => observer?.disconnect());
watch(() => props.rows, () => { active.value = null; });
const left = 42;
const right = computed(() => width.value - 42);
const rows = computed(() => props.rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date)).slice().sort((a, b) => a.date.localeCompare(b.date)));
const maxima = computed(() => [0, 1].map(series => {
  const max = Math.max(1, ...rows.value.map(row => Number(row.values[series]) || 0));
  const step = 10 ** Math.max(0, Math.floor(Math.log10(max / 4)));
  return Math.max(4, Math.ceil(max / (4 * step)) * 4 * step);
}));
const points = computed(() => {
  const stamp = date => Date.parse(`${date}T00:00:00Z`);
  const first = stamp(rows.value[0]?.date);
  const span = stamp(rows.value.at(-1)?.date) - first;
  return rows.value.map(row => ({ ...row, x: span ? left + (stamp(row.date) - first) / span * (right.value - left) : (left + right.value) / 2 }));
});
const selected = computed(() => active.value === null ? null : points.value[active.value]);
const ticks = computed(() => {
  const count = Math.min(points.value.length, Math.max(2, Math.floor((right.value - left) / 100)));
  return Array.from({ length: count }, (_, index) => ({
    ...points.value[Math.round(index * (points.value.length - 1) / Math.max(1, count - 1))],
    anchor: index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle',
  }));
});
function yTick(i) { return 20 + (i - 1) * 50; }
function y(point, series) { return 220 - (Number(point.values[series]) || 0) / maxima.value[series] * 200; }
function path(series) { return points.value.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${y(point, series)}`).join(' '); }
function hitStart(index) { return index ? (points.value[index - 1].x + points.value[index].x) / 2 : left; }
function hitEnd(index) { return index === points.value.length - 1 ? right.value : (points.value[index].x + points.value[index + 1].x) / 2; }
function number(value) { return new Intl.NumberFormat('es-ES', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0); }
function dateLabel(date, long = false) { return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(long ? { year: 'numeric' } : {}), timeZone: 'UTC' }); }
function pointLabel(point) { return `${dateLabel(point.date, true)}. ${props.labels.map((label, index) => `${label}: ${point.values[index]}`).join(', ')}. ${point.extra || ''}`; }
</script>

<style scoped>
.daily-chart { width: 100%; min-width: 0; }
.legend { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.legend button { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 8px 10px; min-height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--text); font-size: 12px; }
.legend button[aria-pressed="false"] { opacity: 0.5; }
.legend small { color: var(--text-muted); }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.swatch.series-0 { background: #3574b9; }
.swatch.series-1 { background: #b0552f; }
.plot { border-radius: 12px; background: var(--background); }
svg { display: block; width: 100%; height: 260px; overflow: visible; }
text { fill: var(--text-muted); font-family: inherit; font-size: 11px; }
.grid line { stroke: var(--border); stroke-dasharray: 3 4; }
.line { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
path.series-0 { stroke: #3574b9; }
path.series-1 { stroke: #b0552f; }
circle.series-0 { fill: #3574b9; }
circle.series-1 { fill: #b0552f; }
.crosshair { stroke: var(--text-muted); stroke-dasharray: 4 4; }
.hit { fill: transparent; cursor: crosshair; }
.hit:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.detail { display: flex; flex-wrap: wrap; align-content: center; gap: 6px 16px; min-height: 74px; padding: 12px; border-top: 1px solid var(--border); font-size: 12px; }
.detail span { display: inline-flex; align-items: center; gap: 6px; }
.hint { color: var(--text-muted); }
@media (max-width: 640px) { .legend button { flex: 1 1 130px; } .detail { min-height: 110px; } .detail strong { width: 100%; } }
</style>
