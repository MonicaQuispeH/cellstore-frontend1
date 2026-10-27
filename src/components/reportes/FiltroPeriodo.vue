<script setup>
import { computed } from 'vue'
import { fechaLocal } from '../../utils/reportes'

const inicio = defineModel('inicio', { default: '' })
const fin = defineModel('fin', { default: '' })
const emit = defineEmits(['limpiar'])
const invalido = computed(() => Boolean(inicio.value && fin.value && inicio.value > fin.value))

function periodo(tipo) {
  const hoy = new Date()
  if (tipo === 'todo') { inicio.value = ''; fin.value = '' }
  if (tipo === 'hoy') { inicio.value = fin.value = fechaLocal(hoy) }
  if (tipo === '7d') {
    const d = new Date(hoy); d.setDate(d.getDate() - 6)
    inicio.value = fechaLocal(d); fin.value = fechaLocal(hoy)
  }
  if (tipo === 'mes') {
    inicio.value = fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    fin.value = fechaLocal(hoy)
  }
}
</script>

<template>
  <div class="panel mb-4">
    <div class="panel-title">
      <h3>Filtros</h3>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-sm" @click="periodo('hoy')">Hoy</button>
        <button class="btn btn-outline-secondary btn-sm" @click="periodo('7d')">Últimos 7 días</button>
        <button class="btn btn-outline-secondary btn-sm" @click="periodo('mes')">Este mes</button>
        <button class="btn btn-outline-secondary btn-sm" @click="periodo('todo')">Todo</button>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-md-3"><label class="form-label">Desde</label><input class="form-control" type="date" v-model="inicio" /></div>
      <div class="col-md-3"><label class="form-label">Hasta</label><input class="form-control" type="date" v-model="fin" /></div>
      <slot />
    </div>
    <button class="btn btn-outline-secondary btn-sm mt-3" @click="emit('limpiar')">Limpiar filtros</button>
    <div v-if="invalido" class="alert alert-warning mt-3 mb-0">Revisa el periodo: la fecha inicial debe ser anterior o igual a la final.</div>
  </div>
</template>
