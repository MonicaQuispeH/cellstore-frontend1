<script setup>
import { ref, computed, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api, bolivianos } from '../services/api'

const ventas = ref([]), error = ref(''), grafico = ref(null)
const inicio = ref(''), fin = ref(''), modelo = ref('')
let chart
const modelos = computed(() => [...new Set(ventas.value.map(v => v.producto).filter(Boolean))].sort())
const rangoInvalido = computed(() => Boolean(inicio.value && fin.value && inicio.value > fin.value))
const ventasFiltradas = computed(() => rangoInvalido.value ? [] : ventas.value.filter(v => {
 const fecha = String(v.fecha || '').slice(0, 10)
 return (!inicio.value || fecha >= inicio.value) && (!fin.value || fecha <= fin.value) && (!modelo.value || v.producto === modelo.value)
}).sort((a,b) => String(b.fecha).localeCompare(String(a.fecha))))
const unidades = computed(() => ventasFiltradas.value.reduce((s,v) => s + Number(v.cantidad || 1), 0))
const ingresos = computed(() => ventasFiltradas.value.reduce((s,v) => s + Number(v.total || 0), 0))
const resumen = computed(() => {
 const map = new Map()
 for (const v of ventasFiltradas.value) {
  const nombre = v.producto || 'Sin modelo'
  if (!map.has(nombre)) map.set(nombre, { nombre, cantidad: 0, ingresos: 0 })
  const r = map.get(nombre)
  r.cantidad += Number(v.cantidad || 1)
  r.ingresos += Number(v.total || 0)
 }
 return [...map.values()].sort((a,b) => b.cantidad - a.cantidad)
})
const masVendido = computed(() => resumen.value[0]?.nombre || 'Sin ventas')
function dibujar() {
 chart?.destroy(); chart = null
 if (!grafico.value || !resumen.value.length) return
 chart = new Chart(grafico.value, { type:'bar', data:{ labels:resumen.value.map(r=>r.nombre), datasets:[{label:'Unidades',data:resumen.value.map(r=>r.cantidad),backgroundColor:'#5b66e9',borderRadius:6}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}} })
}
watch(resumen, async () => { await nextTick(); dibujar() })
onMounted(async () => { try { ventas.value = await api.listar('ventas'); await nextTick(); dibujar() } catch(e) { error.value = e.message } })
onBeforeUnmount(() => chart?.destroy())
function exportarPDF() {
 if (rangoInvalido.value) { error.value = 'La fecha inicial no puede ser posterior a la fecha final.'; return }
 error.value = ''
 const doc = new jsPDF({orientation:'landscape'})
 const ancho = doc.internal.pageSize.getWidth()
 doc.setFillColor(32,45,86); doc.rect(0,0,ancho,29,'F')
 doc.setTextColor(255); doc.setFontSize(19); doc.text('CELLSTORE | Reporte de ventas',14,17)
 doc.setFontSize(9); doc.text('Generado: ' + new Date().toLocaleString('es-BO'),ancho-14,17,{align:'right'})
 doc.setTextColor(35,45,65); doc.setFontSize(11)
 doc.text(`Desde: ${inicio.value || 'Todas'}   Hasta: ${fin.value || 'Todas'}`,14,38)
 doc.text('Modelo: ' + (modelo.value || 'Todos'),14,45)
 doc.setFontSize(10)
 doc.text(`Ventas: ${ventasFiltradas.value.length}     Celulares vendidos: ${unidades.value}     Ingresos: ${bolivianos(ingresos.value)}`,14,53)
 doc.text('Modelo mas vendido: ' + masVendido.value,14,60)
 autoTable(doc,{startY:67,head:[['Modelo','Unidades vendidas','Ingresos (Bs)']],body:resumen.value.map(r=>[r.nombre,r.cantidad,r.ingresos.toFixed(2)]),theme:'striped',headStyles:{fillColor:[57,76,143]},styles:{fontSize:9}})
 let y = doc.lastAutoTable.finalY + 12
 if (y > 165) {doc.addPage();y=20}
 doc.setFontSize(12); doc.text('Detalle de ventas',14,y)
 autoTable(doc,{startY:y+5,head:[['Fecha y hora','Cliente','Marca y modelo','IMEI','Cantidad','Precio unitario (Bs)','Total (Bs)']],body:ventasFiltradas.value.map(v=>[String(v.fecha||'').replace('T',' '),v.cliente||'',v.producto||'',v.imei||'Sin registrar',Number(v.cantidad||1),Number(v.precioUnitario||0).toFixed(2),Number(v.total||0).toFixed(2)]),theme:'grid',headStyles:{fillColor:[57,76,143]},styles:{fontSize:8}})
 const paginas=doc.internal.getNumberOfPages()
 for(let i=1;i<=paginas;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(110);doc.text(`CellStore | Pagina ${i} de ${paginas}`,14,doc.internal.pageSize.getHeight()-7)}
 doc.save(`reporte-cellstore-${new Date().toISOString().slice(0,10)}.pdf`)
}
</script>
<template>
<div class="page-heading"><div><div class="eyebrow">REPORTES</div><h1>Reportes de ventas</h1><p>Consulta las ventas realizadas, los ingresos y los modelos más vendidos.</p></div><button class="btn btn-primary" @click="exportarPDF"><i class="bi bi-file-earmark-pdf me-2"></i> Descargar PDF</button></div>
<div v-if="error" class="alert alert-danger">{{ error }}</div>
<div class="panel mb-4"><div class="panel-title"><h3>Seleccionar periodo</h3></div><div class="row g-3"><div class="col-md-4"><label class="form-label">Desde</label><input class="form-control" type="date" v-model="inicio" /></div><div class="col-md-4"><label class="form-label">Hasta</label><input class="form-control" type="date" v-model="fin" /></div><div class="col-md-4"><label class="form-label">Modelo</label><select class="form-select" v-model="modelo"><option value="">Todos los modelos</option><option v-for="m in modelos" :key="m" :value="m">{{ m }}</option></select></div></div><button class="btn btn-outline-secondary btn-sm mt-3" @click="inicio='';fin='';modelo=''">Limpiar filtros</button></div>
<div v-if="rangoInvalido" class="alert alert-warning">Revisa el periodo: la fecha inicial debe ser anterior o igual a la final.</div>
<div class="row g-3 mb-4"><div v-for="item in [{t:'Ventas realizadas',v:ventasFiltradas.length},{t:'Celulares vendidos',v:unidades},{t:'Ingresos',v:bolivianos(ingresos)},{t:'Modelo más vendido',v:masVendido}]" :key="item.t" class="col-md-6 col-xl-3"><div class="stat-card"><div class="stat-label">{{ item.t }}</div><div class="stat-value" style="font-size:1.3rem;overflow-wrap:anywhere">{{ item.v }}</div></div></div></div>
<div class="panel mb-4"><div class="panel-title"><h3>Modelos más vendidos</h3></div><div v-if="resumen.length" class="chart-container"><canvas ref="grafico"></canvas></div><p v-else class="text-muted">No hay ventas en el periodo seleccionado.</p></div>
<div class="panel mb-4"><div class="panel-title"><h3>Resumen por modelo</h3></div><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Modelo</th><th>Unidades vendidas</th><th>Ingresos</th></tr></thead><tbody><tr v-for="r in resumen" :key="r.nombre"><td>{{ r.nombre }}</td><td>{{ r.cantidad }}</td><td>{{ bolivianos(r.ingresos) }}</td></tr><tr v-if="!resumen.length"><td colspan="3">Sin ventas</td></tr></tbody></table></div></div>
<div class="panel"><div class="panel-title"><h3>Detalle de ventas con fecha, hora e IMEI</h3></div><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Modelo</th><th>IMEI</th><th>Cantidad</th><th>Total</th></tr></thead><tbody><tr v-for="v in ventasFiltradas" :key="v.id"><td>{{ String(v.fecha||'').replace('T',' ') }}</td><td>{{ v.cliente }}</td><td>{{ v.producto }}</td><td>{{ v.imei || 'Sin registrar' }}</td><td>{{ v.cantidad || 1 }}</td><td>{{ bolivianos(v.total) }}</td></tr><tr v-if="!ventasFiltradas.length"><td colspan="6">No hay ventas en el periodo seleccionado.</td></tr></tbody></table></div></div>
</template>
