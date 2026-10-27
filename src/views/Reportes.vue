<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../services/api'
import ReporteVentas from '../components/reportes/ReporteVentas.vue'
import ReporteInventario from '../components/reportes/ReporteInventario.vue'
import ReporteClientes from '../components/reportes/ReporteClientes.vue'
import ReporteMarcas from '../components/reportes/ReporteMarcas.vue'

const pestanas = [
  { id: 'ventas', nombre: 'Ventas', icono: 'bi-receipt', comp: ReporteVentas },
  { id: 'inventario', nombre: 'Inventario', icono: 'bi-box-seam', comp: ReporteInventario },
  { id: 'clientes', nombre: 'Clientes', icono: 'bi-people', comp: ReporteClientes },
  { id: 'marcas', nombre: 'Marcas y meses', icono: 'bi-bar-chart-line', comp: ReporteMarcas }
]
const actual = ref('ventas')
const ventas = ref([])
const celulares = ref([])
const cargando = ref(true)
const error = ref('')

// Se cargan los datos una sola vez y se comparten entre todos los reportes
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    [ventas.value, celulares.value] = await Promise.all([api.listar('ventas'), api.listar('celulares')])
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">REPORTES</div>
      <h1>Reportes</h1>
      <p>Ventas, inventario, clientes y rendimiento por marca. Todos se pueden descargar en PDF y CSV.</p>
    </div>
    <button class="btn btn-outline-secondary" :disabled="cargando" @click="cargar"><i class="bi bi-arrow-clockwise me-2"></i>Actualizar datos</button>
  </div>

  <ul class="nav nav-pills mb-4 gap-2">
    <li v-for="p in pestanas" :key="p.id" class="nav-item">
      <button class="nav-link" :class="{ active: actual === p.id }" @click="actual = p.id">
        <i class="bi me-2" :class="p.icono"></i>{{ p.nombre }}
      </button>
    </li>
  </ul>

  <div v-if="error" class="alert alert-danger d-flex justify-content-between align-items-center">
    <span>{{ error }}</span><button class="btn btn-sm btn-outline-danger" @click="cargar">Reintentar</button>
  </div>

  <div v-if="cargando" class="panel text-center text-muted py-5"><div class="spinner-border spinner-border-sm me-2"></div>Cargando datos...</div>

  <template v-else-if="!error">
    <component :is="pestanas.find(p => p.id === actual).comp" :ventas="ventas" :celulares="celulares" />
  </template>
</template>

<style scoped>
.nav-pills .nav-link { color: #56627c; font-weight: 700; border-radius: 9px; background: #fff; border: 1px solid #e5eaf3; }
.nav-pills .nav-link.active { background: #5363e6; border-color: #5363e6; color: #fff; }
</style>
