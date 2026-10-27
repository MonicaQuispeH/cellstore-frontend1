<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { bolivianos } from '../../services/api'
import { useCharts, descargarCSV, generarPDF } from '../../utils/reportes'

const props = defineProps({
  celulares: { type: Array, default: () => [] },
  ventas: { type: Array, default: () => [] }
})

const STOCK_BAJO = 3 // mismo umbral que usa la pantalla de Celulares
const marca = ref('')
const estado = ref('')
const buscar = ref('')
const canvasMarcas = ref(null)
const canvasEstado = ref(null)
const { poner, limpiar } = useCharts()

const estadoDe = stock => stock <= 0 ? 'Agotado' : stock <= STOCK_BAJO ? 'Stock bajo' : 'Disponible'
const claseEstado = e => e === 'Agotado' ? 'text-bg-danger' : e === 'Stock bajo' ? 'text-bg-warning' : 'text-bg-success'

// Une cada celular con las unidades vendidas (por celularId; si no, por nombre)
const filas = computed(() => props.celulares.map(c => {
  const nombre = `${c.marca} ${c.modelo}`
  const vendidas = props.ventas
    .filter(v => String(v.celularId) === String(c.id) || (!v.celularId && v.producto === nombre))
    .reduce((s, v) => s + Number(v.cantidad || 1), 0)
  const stock = Number(c.stock || 0)
  const precio = Number(c.precio || 0)
  return { id: c.id, marca: c.marca, modelo: c.modelo, nombre, precio, stock, vendidas, valor: precio * stock, estado: estadoDe(stock) }
}))

const marcas = computed(() => [...new Set(props.celulares.map(c => c.marca).filter(Boolean))].sort())

const filtradas = computed(() => {
  const t = buscar.value.trim().toLowerCase()
  return filas.value
    .filter(f => (!marca.value || f.marca === marca.value) && (!estado.value || f.estado === estado.value) && (!t || f.nombre.toLowerCase().includes(t)))
    .sort((a, b) => a.stock - b.stock || a.nombre.localeCompare(b.nombre)) // lo más urgente primero
})

const totalUnidades = computed(() => filtradas.value.reduce((s, f) => s + f.stock, 0))
const valorTotal = computed(() => filtradas.value.reduce((s, f) => s + f.valor, 0))
const agotados = computed(() => filtradas.value.filter(f => f.estado === 'Agotado'))
const bajos = computed(() => filtradas.value.filter(f => f.estado === 'Stock bajo'))

const kpis = computed(() => [
  { t: 'Modelos', v: filtradas.value.length, i: 'bi-phone', c: 'blue' },
  { t: 'Unidades en stock', v: totalUnidades.value, i: 'bi-box-seam', c: 'violet' },
  { t: 'Valor del inventario', v: bolivianos(valorTotal.value), i: 'bi-cash-stack', c: 'green' },
  { t: 'Agotados', v: agotados.value.length, i: 'bi-x-octagon', c: 'orange' },
  { t: 'Stock bajo (≤ ' + STOCK_BAJO + ')', v: bajos.value.length, i: 'bi-exclamation-triangle', c: 'orange' }
])

const stockPorMarca = computed(() => {
  const m = new Map()
  for (const f of filtradas.value) m.set(f.marca, (m.get(f.marca) || 0) + f.stock)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
})
const conteoEstados = computed(() => ['Disponible', 'Stock bajo', 'Agotado'].map(e => filtradas.value.filter(f => f.estado === e).length))

function dibujar() {
  if (!filtradas.value.length) { limpiar(); return }
  poner('marcas', canvasMarcas.value, {
    type: 'bar',
    data: { labels: stockPorMarca.value.map(([m]) => m), datasets: [{ label: 'Unidades', data: stockPorMarca.value.map(([, n]) => n), backgroundColor: '#5b66e9', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  })
  poner('estado', canvasEstado.value, {
    type: 'doughnut',
    data: { labels: ['Disponible', 'Stock bajo', 'Agotado'], datasets: [{ data: conteoEstados.value, backgroundColor: ['#1caa80', '#f2c14e', '#e15b7a'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  })
}
watch(filtradas, async () => { await nextTick(); dibujar() })
onMounted(() => nextTick(dibujar))

const encabezado = ['Marca', 'Modelo', 'Precio (Bs)', 'Stock', 'Vendidas', 'Valor en stock (Bs)', 'Estado']
const fila = f => [f.marca, f.modelo, f.precio.toFixed(2), f.stock, f.vendidas, f.valor.toFixed(2), f.estado]
function limpiarFiltros() { marca.value = ''; estado.value = ''; buscar.value = '' }
function exportarCSV() { descargarCSV('reporte-inventario', [encabezado, ...filtradas.value.map(fila)]) }
function exportarPDF() {
  generarPDF({
    titulo: 'Reporte de inventario', nombre: 'reporte-inventario',
    lineas: [
      `Marca: ${marca.value || 'Todas'}   Estado: ${estado.value || 'Todos'}`,
      `Modelos: ${filtradas.value.length}     Unidades en stock: ${totalUnidades.value}     Valor del inventario: ${bolivianos(valorTotal.value)}`,
      `Agotados: ${agotados.value.length}     Stock bajo: ${bajos.value.length}`
    ],
    tablas: [{ titulo: 'Detalle de inventario (lo más urgente primero)', head: encabezado, body: filtradas.value.map(fila), foot: ['TOTAL', '', '', totalUnidades.value, '', valorTotal.value.toFixed(2), ''] }]
  })
}
</script>

<template>
  <div class="panel mb-4">
    <div class="panel-title"><h3>Filtros</h3></div>
    <div class="row g-3">
      <div class="col-md-4"><label class="form-label">Marca</label>
        <select class="form-select" v-model="marca"><option value="">Todas las marcas</option><option v-for="m in marcas" :key="m" :value="m">{{ m }}</option></select></div>
      <div class="col-md-4"><label class="form-label">Estado</label>
        <select class="form-select" v-model="estado"><option value="">Todos</option><option>Disponible</option><option>Stock bajo</option><option>Agotado</option></select></div>
      <div class="col-md-4"><label class="form-label">Buscar</label><input class="form-control" v-model="buscar" placeholder="Marca o modelo..." /></div>
    </div>
    <button class="btn btn-outline-secondary btn-sm mt-3" @click="limpiarFiltros">Limpiar filtros</button>
  </div>

  <div class="d-flex gap-2 justify-content-end mb-3">
    <button class="btn btn-outline-primary" :disabled="!filtradas.length" @click="exportarCSV"><i class="bi bi-filetype-csv me-2"></i>Descargar CSV</button>
    <button class="btn btn-primary" :disabled="!filtradas.length" @click="exportarPDF"><i class="bi bi-file-earmark-pdf me-2"></i>Descargar PDF</button>
  </div>

  <div v-if="agotados.length || bajos.length" class="alert alert-warning">
    <strong><i class="bi bi-exclamation-triangle me-1"></i>Hay que reponer:</strong>
    <span v-if="agotados.length"> agotados: {{ agotados.map(a => a.nombre).join(', ') }}.</span>
    <span v-if="bajos.length"> Stock bajo: {{ bajos.map(a => `${a.nombre} (${a.stock})`).join(', ') }}.</span>
  </div>

  <div class="row g-3 mb-4">
    <div v-for="k in kpis" :key="k.t" class="col-md-6 col-xl">
      <div class="stat-card"><div class="stat-icon" :class="k.c"><i class="bi" :class="k.i"></i></div>
        <div class="stat-label">{{ k.t }}</div><div class="stat-value" style="font-size:1.3rem">{{ k.v }}</div></div>
    </div>
  </div>

  <div class="row g-3 mb-4">
    <div class="col-lg-7"><div class="panel h-100"><div class="panel-title"><h3>Stock por marca</h3></div>
      <div v-if="filtradas.length" class="chart-container"><canvas ref="canvasMarcas"></canvas></div><p v-else class="text-muted">Sin datos.</p></div></div>
    <div class="col-lg-5"><div class="panel h-100"><div class="panel-title"><h3>Estado del inventario</h3></div>
      <div v-if="filtradas.length" class="chart-container"><canvas ref="canvasEstado"></canvas></div><p v-else class="text-muted">Sin datos.</p></div></div>
  </div>

  <div class="panel">
    <div class="panel-title"><h3>Detalle de inventario <span class="count-badge">{{ filtradas.length }}</span></h3></div>
    <div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>Marca</th><th>Modelo</th><th>Precio</th><th>Stock</th><th>Vendidas</th><th>Valor en stock</th><th>Estado</th></tr></thead>
      <tbody>
        <tr v-for="f in filtradas" :key="f.id">
          <td class="fw-semibold">{{ f.marca }}</td><td>{{ f.modelo }}</td><td>{{ bolivianos(f.precio) }}</td>
          <td>{{ f.stock }}</td><td>{{ f.vendidas }}</td><td>{{ bolivianos(f.valor) }}</td>
          <td><span class="badge" :class="claseEstado(f.estado)">{{ f.estado }}</span></td>
        </tr>
        <tr v-if="!filtradas.length"><td colspan="7" class="empty-cell">No hay celulares con estos filtros.</td></tr>
      </tbody>
      <tfoot v-if="filtradas.length"><tr class="fw-bold"><td colspan="3">Total</td><td>{{ totalUnidades }}</td><td></td><td>{{ bolivianos(valorTotal) }}</td><td></td></tr></tfoot>
    </table></div>
  </div>
</template>
