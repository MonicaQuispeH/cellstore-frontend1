<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { bolivianos } from '../../services/api'
import { useFiltroFechas, useCharts, descargarCSV, generarPDF, fechaLocal, soloDia } from '../../utils/reportes'
import FiltroPeriodo from './FiltroPeriodo.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({ ventas: { type: Array, default: () => [] } })

const { inicio, fin, invalido, enRango, etiqueta } = useFiltroFechas()
const modelo = ref('')
const cliente = ref('')
const canvasModelos = ref(null)
const canvasDias = ref(null)
const { poner, limpiar } = useCharts()

const modelos = computed(() => [...new Set(props.ventas.map(v => v.producto).filter(Boolean))].sort())

const ventasFiltradas = computed(() => {
  if (invalido.value) return []
  const texto = cliente.value.trim().toLowerCase()
  return props.ventas
    .filter(v => enRango(v)
      && (!modelo.value || v.producto === modelo.value)
      && (!texto || String(v.cliente || '').toLowerCase().includes(texto)))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
})

const unidades = computed(() => ventasFiltradas.value.reduce((s, v) => s + Number(v.cantidad || 1), 0))
const ingresos = computed(() => ventasFiltradas.value.reduce((s, v) => s + Number(v.total || 0), 0))
const ticket = computed(() => ventasFiltradas.value.length ? ingresos.value / ventasFiltradas.value.length : 0)

const resumen = computed(() => {
  const mapa = new Map()
  for (const v of ventasFiltradas.value) {
    const nombre = v.producto || 'Sin modelo'
    if (!mapa.has(nombre)) mapa.set(nombre, { nombre, cantidad: 0, ingresos: 0 })
    const r = mapa.get(nombre)
    r.cantidad += Number(v.cantidad || 1)
    r.ingresos += Number(v.total || 0)
  }
  return [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad || b.ingresos - a.ingresos)
})

const porDia = computed(() => {
  const mapa = new Map()
  for (const v of ventasFiltradas.value) mapa.set(soloDia(v), (mapa.get(soloDia(v)) || 0) + Number(v.total || 0))
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
})

const masVendido = computed(() => resumen.value[0]?.nombre || 'Sin ventas')

const kpis = computed(() => [
  { t: 'Ventas realizadas', v: ventasFiltradas.value.length, i: 'bi-receipt', c: 'blue' },
  { t: 'Celulares vendidos', v: unidades.value, i: 'bi-phone', c: 'violet' },
  { t: 'Ingresos', v: bolivianos(ingresos.value), i: 'bi-cash-stack', c: 'green' },
  { t: 'Ticket promedio', v: bolivianos(ticket.value), i: 'bi-graph-up-arrow', c: 'orange' },
  { t: 'Modelo más vendido', v: masVendido.value, i: 'bi-trophy', c: 'blue' }
])

function dibujar() {
  if (!resumen.value.length) { limpiar(); return }
  poner('modelos', canvasModelos.value, {
    type: 'bar',
    data: { labels: resumen.value.map(r => r.nombre), datasets: [{ label: 'Unidades', data: resumen.value.map(r => r.cantidad), backgroundColor: '#5b66e9', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  })
  poner('dias', canvasDias.value, {
    type: 'line',
    data: { labels: porDia.value.map(([d]) => d), datasets: [{ label: 'Ingresos (Bs)', data: porDia.value.map(([, t]) => t), borderColor: '#1caa80', backgroundColor: 'rgba(28,170,128,.12)', fill: true, tension: 0.3, pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  })
}
watch([resumen, porDia], async () => { await nextTick(); dibujar() })
onMounted(() => nextTick(dibujar))

function limpiarFiltros() { inicio.value = ''; fin.value = ''; modelo.value = ''; cliente.value = '' }

const fila = v => [String(v.fecha || '').replace('T', ' '), v.cliente || '', v.producto || '', v.imei || 'Sin registrar', Number(v.cantidad || 1), Number(v.precioUnitario || 0).toFixed(2), Number(v.total || 0).toFixed(2)]
const encabezado = ['Fecha y hora', 'Cliente', 'Marca y modelo', 'IMEI', 'Cantidad', 'Precio unitario (Bs)', 'Total (Bs)']

function exportarCSV() { descargarCSV('reporte-ventas', [encabezado, ...ventasFiltradas.value.map(fila)]) }
function exportarPDF() {
  generarPDF({
    titulo: 'Reporte de ventas', nombre: 'reporte-ventas',
    lineas: [
      `${etiqueta.value}   Modelo: ${modelo.value || 'Todos'}   Cliente: ${cliente.value.trim() || 'Todos'}`,
      `Ventas: ${ventasFiltradas.value.length}     Celulares vendidos: ${unidades.value}     Ingresos: ${bolivianos(ingresos.value)}     Ticket promedio: ${bolivianos(ticket.value)}`,
      `Modelo más vendido: ${masVendido.value}`
    ],
    tablas: [
      { titulo: 'Resumen por modelo', head: ['Modelo', 'Unidades vendidas', 'Ingresos (Bs)'], body: resumen.value.map(r => [r.nombre, r.cantidad, r.ingresos.toFixed(2)]), foot: ['TOTAL', unidades.value, ingresos.value.toFixed(2)] },
      { titulo: 'Detalle de ventas', head: encabezado, body: ventasFiltradas.value.map(fila), grid: true, fontSize: 8 }
    ]
  })
}
</script>

<template>
  <FiltroPeriodo v-model:inicio="inicio" v-model:fin="fin" @limpiar="limpiarFiltros">
    <div class="col-md-3">
      <label class="form-label">Modelo</label>
      <select class="form-select" v-model="modelo">
        <option value="">Todos los modelos</option>
        <option v-for="m in modelos" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>
    <div class="col-md-3"><label class="form-label">Cliente</label><input class="form-control" v-model="cliente" placeholder="Buscar cliente..." /></div>
  </FiltroPeriodo>

  <div class="d-flex gap-2 justify-content-end mb-3">
    <button class="btn btn-outline-primary" :disabled="!ventasFiltradas.length" @click="exportarCSV"><i class="bi bi-filetype-csv me-2"></i>Descargar CSV</button>
    <button class="btn btn-primary" :disabled="!ventasFiltradas.length" @click="exportarPDF"><i class="bi bi-file-earmark-pdf me-2"></i>Descargar PDF</button>
  </div>

  <div class="row g-3 mb-4">
    <div v-for="k in kpis" :key="k.t" class="col-md-6 col-xl">
      <div class="stat-card">
        <div class="stat-icon" :class="k.c"><i class="bi" :class="k.i"></i></div>
        <div class="stat-label">{{ k.t }}</div>
        <div class="stat-value" style="font-size:1.3rem">{{ k.v }}</div>
      </div>
    </div>
  </div>

  <div class="row g-3 mb-4">
    <div class="col-lg-6"><div class="panel h-100"><div class="panel-title"><h3>Modelos más vendidos</h3></div>
      <div v-if="resumen.length" class="chart-container"><canvas ref="canvasModelos"></canvas></div>
      <p v-else class="text-muted">No hay ventas en el periodo seleccionado.</p></div></div>
    <div class="col-lg-6"><div class="panel h-100"><div class="panel-title"><h3>Ingresos por día</h3></div>
      <div v-if="resumen.length" class="chart-container"><canvas ref="canvasDias"></canvas></div>
      <p v-else class="text-muted">No hay ventas en el periodo seleccionado.</p></div></div>
  </div>

  <div class="panel mb-4">
    <div class="panel-title"><h3>Resumen por modelo</h3></div>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>Modelo</th><th>Unidades vendidas</th><th>Ingresos</th></tr></thead>
      <tbody>
        <tr v-for="r in resumen" :key="r.nombre"><td>{{ r.nombre }}</td><td>{{ r.cantidad }}</td><td>{{ bolivianos(r.ingresos) }}</td></tr>
        <tr v-if="!resumen.length"><td colspan="3" class="empty-cell">Sin ventas</td></tr>
      </tbody>
      <tfoot v-if="resumen.length"><tr class="fw-bold"><td>Total</td><td>{{ unidades }}</td><td>{{ bolivianos(ingresos) }}</td></tr></tfoot>
    </table></div>
  </div>

  <div class="panel">
    <div class="panel-title"><h3>Detalle de ventas con fecha, hora e IMEI <span class="count-badge">{{ ventasFiltradas.length }}</span></h3></div>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Modelo</th><th>IMEI</th><th>Cantidad</th><th>Total</th></tr></thead>
      <tbody>
        <tr v-for="v in ventasFiltradas" :key="v.id">
          <td>{{ String(v.fecha || '').replace('T', ' ') }}</td><td>{{ v.cliente }}</td><td>{{ v.producto }}</td>
          <td>{{ v.imei || 'Sin registrar' }}</td><td>{{ v.cantidad || 1 }}</td><td>{{ bolivianos(v.total) }}</td>
        </tr>
        <tr v-if="!ventasFiltradas.length"><td colspan="6" class="empty-cell">No hay ventas en el periodo seleccionado.</td></tr>
      </tbody>
    </table></div>
  </div>
</template>
