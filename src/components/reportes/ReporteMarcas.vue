<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { bolivianos } from '../../services/api'
import { useFiltroFechas, useCharts, descargarCSV, generarPDF, PALETA, nombreMes, porcentaje } from '../../utils/reportes'
import FiltroPeriodo from './FiltroPeriodo.vue'

const props = defineProps({
  ventas: { type: Array, default: () => [] },
  celulares: { type: Array, default: () => [] }
})

const { inicio, fin, invalido, enRango, etiqueta } = useFiltroFechas()
const canvasMarcas = ref(null)
const canvasMeses = ref(null)
const { poner, limpiar } = useCharts()

// La marca se saca del celular vendido; si ya no existe, de la primera palabra del producto
const marcaDe = v => {
  const c = props.celulares.find(x => String(x.id) === String(v.celularId))
  return c?.marca || String(v.producto || 'Sin marca').split(' ')[0]
}

const filtradas = computed(() => invalido.value ? [] : props.ventas.filter(enRango))
const ingresos = computed(() => filtradas.value.reduce((s, v) => s + Number(v.total || 0), 0))
const unidades = computed(() => filtradas.value.reduce((s, v) => s + Number(v.cantidad || 1), 0))

const porMarca = computed(() => {
  const m = new Map()
  for (const v of filtradas.value) {
    const k = marcaDe(v)
    if (!m.has(k)) m.set(k, { marca: k, ventas: 0, unidades: 0, ingresos: 0 })
    const r = m.get(k)
    r.ventas += 1; r.unidades += Number(v.cantidad || 1); r.ingresos += Number(v.total || 0)
  }
  return [...m.values()].sort((a, b) => b.ingresos - a.ingresos)
})

const porMes = computed(() => {
  const m = new Map()
  for (const v of filtradas.value) {
    const k = String(v.fecha || '').slice(0, 7) // AAAA-MM
    if (!k) continue
    if (!m.has(k)) m.set(k, { mes: k, ventas: 0, unidades: 0, ingresos: 0 })
    const r = m.get(k)
    r.ventas += 1; r.unidades += Number(v.cantidad || 1); r.ingresos += Number(v.total || 0)
  }
  const lista = [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes))
  return lista.map((r, i) => ({ ...r, variacion: i && lista[i - 1].ingresos ? ((r.ingresos - lista[i - 1].ingresos) / lista[i - 1].ingresos) * 100 : null }))
})

const marcaLider = computed(() => porMarca.value[0]?.marca || 'Sin ventas')
const mejorMes = computed(() => {
  const m = [...porMes.value].sort((a, b) => b.ingresos - a.ingresos)[0]
  return m ? nombreMes(m.mes) : 'Sin ventas'
})

const kpis = computed(() => [
  { t: 'Marcas vendidas', v: porMarca.value.length, i: 'bi-tags', c: 'blue' },
  { t: 'Marca líder', v: marcaLider.value, i: 'bi-trophy', c: 'violet' },
  { t: 'Mejor mes', v: mejorMes.value, i: 'bi-calendar-check', c: 'green' },
  { t: 'Ingresos del periodo', v: bolivianos(ingresos.value), i: 'bi-cash-stack', c: 'orange' }
])

const textoVar = v => v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
const claseVar = v => v === null ? 'text-muted' : v >= 0 ? 'text-success' : 'text-danger'

function dibujar() {
  if (!porMarca.value.length) { limpiar(); return }
  poner('marcas', canvasMarcas.value, {
    type: 'doughnut',
    data: { labels: porMarca.value.map(r => r.marca), datasets: [{ data: porMarca.value.map(r => r.ingresos), backgroundColor: PALETA }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  })
  poner('meses', canvasMeses.value, {
    type: 'bar',
    data: { labels: porMes.value.map(r => nombreMes(r.mes)), datasets: [{ label: 'Ingresos (Bs)', data: porMes.value.map(r => r.ingresos), backgroundColor: '#1caa80', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  })
}
watch([porMarca, porMes], async () => { await nextTick(); dibujar() })
onMounted(() => nextTick(dibujar))

const headMarca = ['Marca', 'Ventas', 'Celulares', 'Ingresos (Bs)', '% del total']
const bodyMarca = () => porMarca.value.map(r => [r.marca, r.ventas, r.unidades, r.ingresos.toFixed(2), porcentaje(r.ingresos, ingresos.value)])
const headMes = ['Mes', 'Ventas', 'Celulares', 'Ingresos (Bs)', 'Variación vs mes anterior']
const bodyMes = () => porMes.value.map(r => [nombreMes(r.mes), r.ventas, r.unidades, r.ingresos.toFixed(2), textoVar(r.variacion)])

function limpiarFiltros() { inicio.value = ''; fin.value = '' }
function exportarCSV() { descargarCSV('reporte-marcas-meses', [headMarca, ...bodyMarca(), [], headMes, ...bodyMes()]) }
function exportarPDF() {
  generarPDF({
    titulo: 'Reporte por marca y por mes', nombre: 'reporte-marcas-meses',
    lineas: [etiqueta.value, `Ingresos: ${bolivianos(ingresos.value)}     Celulares vendidos: ${unidades.value}     Marca líder: ${marcaLider.value}     Mejor mes: ${mejorMes.value}`],
    tablas: [
      { titulo: 'Ventas por marca', head: headMarca, body: bodyMarca(), foot: ['TOTAL', filtradas.value.length, unidades.value, ingresos.value.toFixed(2), '100%'] },
      { titulo: 'Ventas por mes', head: headMes, body: bodyMes() }
    ]
  })
}
</script>

<template>
  <FiltroPeriodo v-model:inicio="inicio" v-model:fin="fin" @limpiar="limpiarFiltros" />

  <div class="d-flex gap-2 justify-content-end mb-3">
    <button class="btn btn-outline-primary" :disabled="!filtradas.length" @click="exportarCSV"><i class="bi bi-filetype-csv me-2"></i>Descargar CSV</button>
    <button class="btn btn-primary" :disabled="!filtradas.length" @click="exportarPDF"><i class="bi bi-file-earmark-pdf me-2"></i>Descargar PDF</button>
  </div>

  <div class="row g-3 mb-4">
    <div v-for="k in kpis" :key="k.t" class="col-md-6 col-xl-3">
      <div class="stat-card"><div class="stat-icon" :class="k.c"><i class="bi" :class="k.i"></i></div>
        <div class="stat-label">{{ k.t }}</div><div class="stat-value" style="font-size:1.3rem">{{ k.v }}</div></div>
    </div>
  </div>

  <div class="row g-3 mb-4">
    <div class="col-lg-5"><div class="panel h-100"><div class="panel-title"><h3>Ingresos por marca</h3></div>
      <div v-if="porMarca.length" class="chart-container"><canvas ref="canvasMarcas"></canvas></div><p v-else class="text-muted">No hay ventas en el periodo seleccionado.</p></div></div>
    <div class="col-lg-7"><div class="panel h-100"><div class="panel-title"><h3>Ingresos por mes</h3></div>
      <div v-if="porMes.length" class="chart-container"><canvas ref="canvasMeses"></canvas></div><p v-else class="text-muted">No hay ventas en el periodo seleccionado.</p></div></div>
  </div>

  <div class="row g-3">
    <div class="col-lg-6"><div class="panel h-100"><div class="panel-title"><h3>Ventas por marca</h3></div>
      <div class="table-responsive"><table class="table align-middle">
        <thead><tr><th>Marca</th><th>Ventas</th><th>Celulares</th><th>Ingresos</th><th>%</th></tr></thead>
        <tbody>
          <tr v-for="r in porMarca" :key="r.marca"><td class="fw-semibold">{{ r.marca }}</td><td>{{ r.ventas }}</td><td>{{ r.unidades }}</td><td>{{ bolivianos(r.ingresos) }}</td><td>{{ porcentaje(r.ingresos, ingresos) }}</td></tr>
          <tr v-if="!porMarca.length"><td colspan="5" class="empty-cell">Sin ventas</td></tr>
        </tbody>
      </table></div></div></div>
    <div class="col-lg-6"><div class="panel h-100"><div class="panel-title"><h3>Ventas por mes</h3></div>
      <div class="table-responsive"><table class="table align-middle">
        <thead><tr><th>Mes</th><th>Ventas</th><th>Celulares</th><th>Ingresos</th><th>Variación</th></tr></thead>
        <tbody>
          <tr v-for="r in porMes" :key="r.mes"><td class="fw-semibold">{{ nombreMes(r.mes) }}</td><td>{{ r.ventas }}</td><td>{{ r.unidades }}</td><td>{{ bolivianos(r.ingresos) }}</td><td :class="claseVar(r.variacion)">{{ textoVar(r.variacion) }}</td></tr>
          <tr v-if="!porMes.length"><td colspan="5" class="empty-cell">Sin ventas</td></tr>
        </tbody>
      </table></div></div></div>
  </div>
</template>
