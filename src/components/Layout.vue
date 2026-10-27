<script setup>
import { useRouter } from 'vue-router'
import { esDemo } from '../services/api'
const router = useRouter()
function salir() { sessionStorage.removeItem('cellstore_login'); router.push('/login') }
</script>
<template>
 <div class="app-shell">
  <aside class="sidebar">
   <router-link to="/" class="brand"><span class="brand-icon"><i class="bi bi-phone"></i></span><span>Cell<span class="brand-accent">Store</span><small>ADMINISTRACIÓN</small></span></router-link>
   <div class="sidebar-label">MENÚ PRINCIPAL</div>
   <nav class="nav flex-column gap-2">
    <router-link to="/" class="side-link" exact-active-class="active"><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
    <router-link to="/celulares" class="side-link" active-class="active"><i class="bi bi-phone"></i> Celulares</router-link>
    <router-link to="/ventas" class="side-link" active-class="active"><i class="bi bi-bag-check"></i> Ventas</router-link>
    <router-link to="/reportes" class="side-link" active-class="active"><i class="bi bi-bar-chart"></i> Reportes</router-link>
   </nav>
   <div class="sidebar-footer"><span class="status-dot"></span> {{ esDemo ? 'Modo demostración' : 'Conectado a MockAPI' }}</div>
  </aside>
  <div class="main-area">
   <header class="topbar"><div><span class="mobile-brand">CellStore</span><span class="topbar-subtitle">Panel de administración</span></div><div class="d-flex align-items-center gap-3"><span class="user-chip"><i class="bi bi-person-circle"></i> Administrador</span><button class="btn btn-outline-secondary btn-sm" @click="salir"><i class="bi bi-box-arrow-right"></i> Salir</button></div></header>
   <nav class="mobile-nav"><router-link to="/">Inicio</router-link><router-link to="/celulares">Celulares</router-link><router-link to="/ventas">Ventas</router-link><router-link to="/reportes">Reportes</router-link></nav>
   <main class="content"><router-view /></main>
  </div>
 </div>
</template>
