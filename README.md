# CellStore – Sistema de Venta de Celulares

## Instalar y ejecutar con Git Bash

1. Instala Node.js (versión 20.19+ o 22.12+ recomendada para Vite actual).
2. Descomprime el ZIP y abre la carpeta `cellstore`.
3. Haz clic derecho dentro de la carpeta y elige **Open Git Bash here** (o abre Git Bash y usa `cd`).
4. Ejecuta:

```bash
npm install
npm run dev
```

5. Abre la URL indicada, normalmente `http://localhost:5173/`.

**Login de prueba:** `admin@cellstore.com` / `123456`.


## Configurar MockAPI

1. En https://mockapi.io crea una cuenta y un proyecto.
2. Crea los recursos (nombres exactos):
   - `celulares`: `marca` (string), `modelo` (string), `precio` (number), `stock` (number).
   - `ventas`: `fecha` (string), `cliente` (string), `celularId` (string), `producto` (string), `cantidad` (number), `precioUnitario` (number), `total` (number).
3. Copia la URL base del proyecto, por ejemplo `https://xxxxxxxx.mockapi.io/api/v1`.
4. Copia `.env.example` a un archivo llamado `.env` y edita:

```env
VITE_API_URL=https://xxxxxxxx.mockapi.io/api/v1
```

5. Detén el servidor con `Ctrl+C` y vuelve a ejecutar `npm run dev`.
6. Al principio MockAPI puede tener tablas vacías; registra celulares antes de registrar ventas.

**Nota:** La API de MockAPI es pública para fines de práctica. No guardes datos personales reales ni secretos. El login es demostrativo, no protege la API.

## 4. Subir a GitHub con Git Bash

Crea en GitHub un repositorio **vacío** llamado `cellstore-frontend` (sin README ni .gitignore generado en GitHub). Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Proyecto frontend CellStore"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cellstore-frontend.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu usuario de GitHub. Si Git solicita nombre/correo:

```bash
git config --global user.name "Tu nombre"
git config --global user.email "tu-correo@example.com"
```

Para agregar al docente como colaborador: **Settings → Collaborators → Add people**, busca su usuario de GitHub o correo vinculado a su cuenta (por ejemplo, `jcvallejos@gmail.com`) y envía la invitación. Debe aceptarla.

## 5. Archivos principales

- `src/views/Login.vue`: acceso simulado.
- `src/views/Dashboard.vue`: estadísticas generales.
- `src/views/Celulares.vue`: CRUD de inventario.
- `src/views/Ventas.vue`: CRUD de ventas.
- `src/views/Reportes.vue`: gráfico y pdf.
- `src/services/api.js`: conexión a MockAPI o localStorage.
- `src/assets/main.css`: estilos.


