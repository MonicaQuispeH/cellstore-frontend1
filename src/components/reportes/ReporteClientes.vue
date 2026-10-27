<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { bolivianos } from '../../services/api'
import { useFiltroFechas, useCharts, descargarCSV, generarPDF } from '../../utils/reportes'
import FiltroPeriodo from './FiltroPeriodo.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({ ventas: { type: Array, default: () => [] } })

const { inicio, fin, invalido, enRango, etiqueta } = useFiltroFechas()
const buscar = ref('')
const soloRecurrentes = ref(false)
const canvasTop = ref(null)
const { poner, limpiar } = useCharts()

// Agrupa por cliente (ignora mayúsculas y espacios de más)
const clientes = computed(() => {
  if (invalido.value) return []
  const mapa = new Map()
  for (const v of props.ventas.filter(enRango)) {
    const nombre = String(v.cliente || 'Sin nombre').trim()
    const clave = nombre.toLowerCase()
    if (!mapa.has(clave)) mapa.set(clave, { nombre, compras: 0, unidades: 0, total: 0, ultima: '' })
    const c = mapa.get(clave)
    c.compras += 1
    c.unidades += Number(v.cantidad || 1)
    c.total += Number(v.total || 0)
    if (String(v.fecha) > c.ultima) c.ultima = String(v.fecha)
  }
  return [...mapa.values()].map(c => ({ ...c, ticket: c.total / c.compras })).sort((a, b) => b.total - a.total)
})

const filtrados = computed(() => {
  const t = buscar.value.trim().toLowerCase()
  return clientes.value.filter(c => (!t || c.nombre.toLowerCase().includes(t)) && (!soloRecurrentes.value || c.compras > 1))
})

const totalGastado = computed(() => filtrados.value.reduce((s, c) => s + c.total, 0))
const recurrentes = computed(() => clientes.value.filter(c => c.compras > 1).length)
const mejor = computed(() => clientes.value[0]?.nombre || 'Sin ventas')
const gastoPromedio = computed(() => filtrados.value.length ? totalGastado.value / filtrados.value.length : 0)

const kpis = computed(() => [
  { t: 'Clientes', v: filtrados.value.length, i: 'bi-people', c: 'blue' },
  { t: 'Clientes recurrentes', v: recurrentes.value, i: 'bi-arrow-repeat', c: 'violet' },
  { t: 'Gasto promedio por cliente', v: bolivianos(gastoPromedio.value), i: 'bi-wallet2', c: 'green' },
  { t: 'Mejor cliente', v: mejor.value, i: 'bi-star', c: 'orange' }
])

function dibujar() {
  const top = filtrados.value.slice(0, 5)
  if (!top.length) { limpiar(); return }
  poner('top', canvasTop.value, {
    type: 'bar',
    data: { labels: top.map(c => c.nombre), datasets: [{ label: 'Total gastado (Bs)', data: top.map(c => c.total), backgroundColor: '#9060db', borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
  })
}
watch(filtrados, async () => { await nextTick(); dibujar() })
onMounted(() => nextTick(dibujar))

const encabezado = ['#', 'Cliente', 'Compras', 'Celulares', 'Total gastado (Bs)', 'Ticket promedio (Bs)', 'Última compra']
const fila = (c, i) => [i + 1, c.nombre, c.compras, c.unidades, c.total.toFixed(2), c.ticket.toFixed(2), c.ultima.replace('T', ' ')]
function limpiarFiltros() { inicio.value = ''; fin.value = ''; buscar.value = ''; soloRecurrentes.value = false }
function exportarCSV() { descargarCSV('reporte-clientes', [encabezado, ...filtrados.value.map(fila)]) }
function exportarPDF() {
  generarPDF({
    titulo: 'Reporte de clientes', nombre: 'reporte-clientes',
    lineas: [
      `${etiqueta.value}   Solo recurrentes: ${soloRecurrentes.value ? 'Sí' : 'No'}`,
      `Clientes: ${filtrados.value.length}     Recurrentes: ${recurrentes.value}     Total vendido: ${bolivianos(totalGastado.value)}     Mejor cliente: ${mejor.value}`
    ],
    tablas: [{ titulo: 'Ranking de clientes por monto', head: encabezado, body: filtrados.value.map(fila), foot: ['', 'TOTAL', '', '', totalGastado.value.toFixed(2), '', ''] }]
  })
}
</script>

<template>
  <FiltroPeriodo v-model:inicio="inicio" v-model:fin="fin" @limpiar="limpiarFiltros">
    <div class="col-md-3"><label class="form-label">Cliente</label><input class="form-control" v-model="buscar" placeholder="Buscar cliente..." /></div>
    <div class="col-md-3 d-flex align-items-end">
      <div class="form-check"><input id="rec" class="form-check-input" type="checkbox" v-model="soloRecurrentes" /><label for="rec" class="form-check-label">Solo clientes recurrentes (2+ compras)</label></div>
    </div>
  </FiltroPeriodo>

  <div class="d-flex gap-2 justify-content-end mb-3">
    <button class="btn btn-outline-primary" :disabled="!filtrados.length" @click="exportarCSV"><i class="bi bi-filetype-csv me-2"></i>Descargar CSV</button>
    <button class="btn btn-primary" :disabled="!filtrados.length" @click="exportarPDF"><i class="bi bi-file-earmark-pdf me-2"></i>Descargar PDF</button>
  </div>

  <div class="row g-3 mb-4">
    <div v-for="k in kpis" :key="k.t" class="col-md-6 col-xl-3">
      <div class="stat-card"><div class="stat-icon" :class="k.c"><i class="bi" :class="k.i"></i></div>
        <div class="stat-label">{{ k.t }}</div><div class="stat-value" style="font-size:1.3rem">{{ k.v }}</div></div>
    </div>
  </div>

  <div class="panel mb-4">
    <div class="panel-title"><h3>Top 5 clientes por monto</h3></div>
    <div v-if="filtrados.length" class="chart-container"><canvas ref="canvasTop"></canvas></div>
    <p v-else class="text-muted">No hay clientes en el periodo seleccionado.</p>
  </div>

  <div class="panel">
    <div class="panel-title"><h3>Ranking de clientes <span class="count-badge">{{ filtrados.length }}</span></h3></div>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>#</th><th>Cliente</th><th>Compras</th><th>Celulares</th><th>Total gastado</th><th>Ticket promedio</th><th>Última compra</th></tr></thead>
      <tbody>
        <tr v-for="(c, i) in filtrados" :key="c.nombre">
          <td>{{ i + 1 }}</td><td class="fw-semibold">{{ c.nombre }}</td><td>{{ c.compras }}</td><td>{{ c.unidades }}</td>
          <td>{{ bolivianos(c.total) }}</td><td>{{ bolivianos(c.ticket) }}</td><td>{{ c.ultima.replace('T', ' ') }}</td>
        </tr>
        <tr v-if="!filtrados.length"><td colspan="7" class="empty-cell">No hay clientes con estos filtros.</td></tr>
      </tbody>
    </table></div>
  </div>
</template>
