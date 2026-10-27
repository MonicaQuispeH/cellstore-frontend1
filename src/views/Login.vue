<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const correo = ref('admin@cellstore.com')
const password = ref('123456')
const error = ref('')
const router = useRouter()
function ingresar() {
 if (correo.value.trim().toLowerCase() === 'admin@cellstore.com' && password.value === '123456') {
  sessionStorage.setItem('cellstore_login', 'true'); router.push('/')
 } else error.value = 'Correo o contraseña incorrectos.'
}
</script>
<template>
 <div class="login-page"><div class="login-card">
  <div class="login-banner"><div class="login-logo"><i class="bi bi-phone"></i></div><h1>CellStore</h1><p>Gestión inteligente de celulares y ventas</p><div class="login-illustration"><i class="bi bi-phone-flip"></i><span class="illustration-orbit"></span></div><div class="login-caption">Organiza tu inventario, registra ventas y analiza resultados desde un solo lugar.</div></div>
  <div class="login-form"><div class="login-eyebrow">BIENVENIDO DE NUEVO</div><h2>Iniciar sesión</h2><p class="text-muted mb-4">Ingresa tus credenciales para acceder al panel.</p>
   <form @submit.prevent="ingresar"><label class="form-label">Correo electrónico</label><div class="input-icon"><i class="bi bi-envelope"></i><input v-model="correo" type="email" required class="form-control" placeholder="Correo electrónico" /></div>
   <label class="form-label mt-3">Contraseña</label><div class="input-icon"><i class="bi bi-lock"></i><input v-model="password" type="password" required class="form-control" placeholder="Contraseña" /></div>
   <div v-if="error" class="alert alert-danger mt-3 py-2">{{ error }}</div><button class="btn btn-primary w-100 mt-4 py-3" type="submit">Ingresar al sistema <i class="bi bi-arrow-right ms-2"></i></button></form>
   <div class="demo-hint"><strong>Acceso de prueba</strong><br>admin@cellstore.com · 123456</div><p class="login-note">Proyecto académico: autenticación simulada, no apta para producción.</p>
  </div>
 </div></div>
</template>
