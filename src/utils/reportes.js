import { ref, computed, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const PALETA = ['#5b66e9', '#1caa80', '#e89b54', '#9060db', '#e15b7a', '#3fa7d6', '#8fa5ff', '#f2c14e']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const pad = n => String(n).padStart(2, '0')
// Fecha en hora local (toISOString usa UTC y en Bolivia puede dar el día siguiente)
export const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const soloDia = v => String(v.fecha || '').slice(0, 10)
export const nombreMes = ym => { const [y, m] = ym.split('-'); return `${MESES[Number(m) - 1] || m} ${y}` }
export const porcentaje = (parte, total) => total ? `${((parte / total) * 100).toFixed(1)}%` : '0%'

// ---------- Filtro de fechas reutilizable ----------
export function useFiltroFechas() {
  const inicio = ref('')
  const fin = ref('')
  const invalido = computed(() => Boolean(inicio.value && fin.value && inicio.value > fin.value))
  const enRango = v => {
    const d = soloDia(v)
    return (!inicio.value || d >= inicio.value) && (!fin.value || d <= fin.value)
  }
  const etiqueta = computed(() => `Desde: ${inicio.value || 'Todas'}   Hasta: ${fin.value || 'Todas'}`)
  return { inicio, fin, invalido, enRango, etiqueta }
}

// ---------- Gráficos (Chart.js) con limpieza automática ----------
export function useCharts() {
  const charts = {}
  const limpiar = () => { for (const k of Object.keys(charts)) { charts[k].destroy(); delete charts[k] } }
  const poner = (clave, canvas, config) => {
    charts[clave]?.destroy(); delete charts[clave]
    if (canvas) charts[clave] = new Chart(canvas, config)
  }
  onBeforeUnmount(limpiar)
  return { poner, limpiar }
}

// ---------- CSV (abre bien en Excel: BOM + separador ;) ----------
// filas: array de arrays; la primera fila suele ser el encabezado
export function descargarCSV(nombre, filas) {
  const celda = x => `"${String(x ?? '').replace(/"/g, '""')}"`
  const csv = '\ufeff' + filas.map(f => f.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url; a.download = `${nombre}-${fechaLocal()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ---------- PDF con el estilo de CellStore ----------
// lineas: textos bajo el título | tablas: [{ titulo, head, body, foot?, grid?, fontSize? }]
export function generarPDF({ titulo, nombre, lineas = [], tablas = [] }) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()

  doc.setFillColor(32, 45, 86); doc.rect(0, 0, ancho, 29, 'F')
  doc.setTextColor(255); doc.setFontSize(19); doc.text(`CELLSTORE | ${titulo}`, 14, 17)
  doc.setFontSize(9); doc.text('Generado: ' + new Date().toLocaleString('es-BO'), ancho - 14, 17, { align: 'right' })

  doc.setTextColor(35, 45, 65); doc.setFontSize(10)
  let y = 38
  for (const l of lineas) { doc.text(l, 14, y); y += 7 }
  y += 4

  for (const t of tablas) {
    if (y > alto - 45) { doc.addPage(); y = 20 }
    doc.setTextColor(35, 45, 65); doc.setFontSize(12); doc.text(t.titulo, 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [t.head], body: t.body, foot: t.foot ? [t.foot] : undefined,
      theme: t.grid ? 'grid' : 'striped',
      headStyles: { fillColor: [57, 76, 143] }, footStyles: { fillColor: [32, 45, 86] },
      styles: { fontSize: t.fontSize || 9 }
    })
    y = doc.lastAutoTable.finalY + 12
  }

  const paginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(110)
    doc.text(`CellStore | Página ${i} de ${paginas}`, 14, alto - 7)
  }
  doc.save(`${nombre}-${fechaLocal()}.pdf`)
}
