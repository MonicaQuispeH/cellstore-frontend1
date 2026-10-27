// Sin VITE_API_URL: modo demostración con datos en localStorage.
// Con VITE_API_URL: se usa MockAPI (recursos "celulares" y "ventas").
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const esDemo = !base
const seeds = {
 celulares: [
  { id: '1', marca: 'Samsung', modelo: 'Galaxy A55', precio: 2850, stock: 12 },
  { id: '2', marca: 'Xiaomi', modelo: 'Redmi Note 13', precio: 1750, stock: 9 },
  { id: '3', marca: 'Motorola', modelo: 'Moto G84', precio: 2200, stock: 6 },
  { id: '4', marca: 'Apple', modelo: 'iPhone 13', precio: 4900, stock: 4 }
 ],
 ventas: [
  { id: '1', fecha: '2026-10-20T10:35', cliente: 'María López', celularId: '1', producto: 'Samsung Galaxy A55', cantidad: 1, imei: '356789012345678', precioUnitario: 2850, total: 2850 },
  { id: '2', fecha: '2026-10-22T16:20', cliente: 'Juan Pérez', celularId: '2', producto: 'Xiaomi Redmi Note 13', cantidad: 1, imei: '356789012345679', precioUnitario: 1750, total: 1750 }
 ]
}
function localGet(resource) {
 const key = `cellstore_${resource}`
 if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seeds[resource]))
 try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
async function request(resource, method = 'GET', id = '', payload) {
 if (esDemo) {
  let rows = localGet(resource)
  if (method === 'GET') return structuredClone(rows)
  if (method === 'POST') { const row = { ...payload, id: String(Date.now()) }; rows.push(row); localStorage.setItem(`cellstore_${resource}`, JSON.stringify(rows)); return row }
  if (method === 'PUT') { rows = rows.map(x => String(x.id) === String(id) ? { ...x, ...payload, id: String(id) } : x); localStorage.setItem(`cellstore_${resource}`, JSON.stringify(rows)); return rows.find(x => String(x.id) === String(id)) }
  if (method === 'DELETE') { rows = rows.filter(x => String(x.id) !== String(id)); localStorage.setItem(`cellstore_${resource}`, JSON.stringify(rows)); return true }
 }
 const response = await fetch(`${base}/${resource}${id ? '/' + encodeURIComponent(id) : ''}`, {
  method, headers: { 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {})
 })
 if (!response.ok) throw new Error(`Error ${response.status}: no se pudo completar la operación en MockAPI`)
 return method === 'DELETE' ? true : response.json()
}
export const api = {
 listar: resource => request(resource),
 crear: (resource, data) => request(resource, 'POST', '', data),
 editar: (resource, id, data) => request(resource, 'PUT', id, data),
 eliminar: (resource, id) => request(resource, 'DELETE', id)
}
export const bolivianos = n => `Bs ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
