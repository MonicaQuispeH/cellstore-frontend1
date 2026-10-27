import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Layout from '../components/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import Celulares from '../views/Celulares.vue'
import Ventas from '../views/Ventas.vue'
import Reportes from '../views/Reportes.vue'
const router = createRouter({ history: createWebHistory(), routes: [
 { path: '/login', component: Login },
 { path: '/', component: Layout, children: [
  { path: '', component: Dashboard },
  { path: 'celulares', component: Celulares },
  { path: 'ventas', component: Ventas },
  { path: 'reportes', component: Reportes }
 ] },
 { path: '/:pathMatch(.*)*', redirect: '/' }
] })
router.beforeEach(to => { const logged = sessionStorage.getItem('cellstore_login') === 'true'; if (to.path !== '/login' && !logged) return '/login'; if (to.path === '/login' && logged) return '/' })
export default router
