# Manual del Sistema: SIGO-Sodatal
> **Sistema Integral de Gestión Operacional y Logística de Última Milla**  
> *Versión del Documento: 1.0 — Octubre 2026*

---

## 1. ¿Qué es el Sistema y para qué sirve?

**SIGO-Sodatal** es una **Aplicación Web Integral (ERP y TMS de última milla)** diseñada específicamente para la gestión comercial, logística y operativa de empresas distribuidoras de agua purificada en botellones y soda.

El sistema resuelve toda la cadena de valor del negocio:
1. **Administración central:** Clientes, georreferenciación de comunas/sectores, catálogo de productos, control de envases prestados en comodato y flota de camiones.
2. **Planificación logística:** Creación de rutas diarias, secuenciación de entregas mediante arrastrar y soltar (*drag & drop*), y asignación a choferes.
3. **Operación en calle (Módulo Repartidor):** Interfaz optimizada para teléfonos móviles que permite a los choferes ejecutar la ruta, registrar cobros, vender productos adicionales, emitir guías de despacho oficiales con firma digital y reportar incidencias.
4. **Control financiero y de inventario:** Conciliación de caja diaria (*cuadraturas*) por método de pago (efectivo, POS Transbank, transferencia bancaria y crédito mensual) y control de botellones vacíos retornados.
5. **Trazabilidad y Observabilidad:** Monitoreo de peticiones en tiempo real con identificador único (`trace_id`), logs estructurados JSON de ultra-bajo consumo procesados por Fluent Bit.

---

## 2. ¿De qué está compuesto el sistema?

### 2.1 Stack Tecnológico y Arquitectura
* **Frontend y Backend (Full-Stack):** [Next.js 14](https://nextjs.org/) (App Router) con [React 18](https://react.dev/) y [TypeScript 5](https://www.typescriptlang.org/).
* **Estilos y Diseño Responsivo:** [Tailwind CSS 3](https://tailwindcss.com/) adaptado para PC, tablets y smartphones.
* **Base de Datos y ORM:** [MySQL](https://www.mysql.com/) gestionado a través de [Prisma ORM 6](https://www.prisma.io/).
* **Autenticación y Seguridad:** [Better Auth](https://www.better-auth.com/) con control de sesiones seguras y middleware perimetral.
* **Librerías Clave:**
  * `@dnd-kit`: Ordenamiento interactivo de secuencias de paradas.
  * `lucide-react`: Iconografía SVG ligera.
  * `html2pdf.js`: Generación e impresión de Guías de Despacho en PDF.
  * `pino`: Logger estructurado asíncrono hacia `stdout`.
  * `fluent-bit`: Colector nativo en C para persistencia y rotación de logs en disco.

---

### 2.2 Estructura de Módulos

```
SIGO-Sodatal
├── Panel de Administración (/admin)
│   ├── Rutas y Despacho (/admin/rutas)
│   ├── Guías de Despacho (/admin/guias)
│   ├── Clientes (/admin/clientes)
│   ├── Cuadraturas de Caja (/admin/cuadraturas)
│   ├── Productos y Precios (/admin/productos)
│   ├── Stock de Inventario (/admin/stock)
│   ├── Flota y Choferes (/admin/flota)
│   └── Ajustes de Cuenta (/admin/cuenta)
│
├── Módulo Móvil de Repartidor (/repartidor)
│   ├── Hoja de Ruta Activa (/repartidor/ruta)
│   ├── Guías del Chofer (/repartidor/guias)
│   ├── Cuadratura Personal (/repartidor/cuadraturas)
│   ├── Stock en Camión (/repartidor/stock)
│   └── Perfil y Sesión (/repartidor/perfil)
│
└── Infraestructura y Servicios
    ├── Middleware de Seguridad y Trazabilidad (src/middleware.ts)
    ├── Logger de Ultra-Bajo Consumo (src/lib/logger.ts)
    ├── Configuración Fluent Bit (fluent-bit.conf)
    └── Base de Datos MySQL (prisma/schema.prisma)
```

---

### 2.3 Modelos Principales de Datos
* **`User` / `Session`:** Cuentas de usuario (Administradores y Choferes/Repartidores).
* **`Cliente`:** Datos de contacto, dirección, modalidad de pago (`EFECTIVO`, `TRANSFERENCIA`, `MENSUAL`), sector/comuna y saldo de botellones prestados.
* **`Comuna` y `Sector`:** Clasificación geográfica para agrupar las rutas de entrega.
* **`RutaDia`:** Hoja de ruta para una fecha específica asignada a un chofer y un camión.
* **`ParadaDia`:** Cada parada planificada dentro de una ruta. Almacena la secuencia (`orden`), el estado (`PENDIENTE`, `ENTREGADO`, `POSTERGADO`, `FALLIDO`), cantidades físicas de botellones (20L, 10L, soda) e incidencias.
* **`Pedido` e `PedidoItem`:** Detalle de productos vendidos o recargados, precios históricos y estado de pago.
* **`GuiaDespacho`:** Documento tributario/interno con número correlativo, receptor, RUT, firma digital y estado de entrega.
* **`CuadraturaDiaria`:** Cierre contable del día por camión/chofer que compara ventas teóricas vs. dinero en efectivo, vouchers de tarjetas y transferencias.

---

## 3. Guía de Uso Paso a Paso

### 3.1 Flujo del Administrador (Oficina / PC)

#### Paso 1: Configurar Datos Maestros
1. **Productos:** Dirígete a `/admin/productos` para registrar tus productos (ej. Botellón 20L, Botellón 10L, Sifón de Soda, Dispensador USB). Define precio de recarga y precio de envase nuevo.
2. **Sectores y Comunas:** Asegúrate de clasificar a tus clientes por comuna y sector en `/admin/clientes`.
3. **Flota:** En `/admin/flota`, registra los camiones con su patente y vincula al chofer responsable.

#### Paso 2: Planificar y Asignar la Ruta del Día
1. Ingresa a `/admin/rutas`.
2. Selecciona la fecha de despacho y el camión/chofer asignado.
3. El sistema agrupa automáticamente los pedidos del día por **Comuna** y **Sector**.
4. Puedes reorganizar el orden de entrega arrastrando las tarjetas de las paradas con el icono de agarradera vertical (`:::`) para optimizar el recorrido.
5. El orden se guarda en tiempo real en la base de datos.

#### Paso 3: Monitoreo en Vivo
* Desde `/admin/rutas`, el administrador ve en tiempo real cómo avanza la ruta: paradas entregadas en verde, paradas pendientes en amarillo y postergadas en rojo.

#### Paso 4: Cierre y Cuadratura de Caja
1. Al final de la jornada, ve a `/admin/cuadraturas`.
2. Selecciona el camión y la fecha.
3. El sistema calcula automáticamente el total esperado a recaudar desglosado por:
   * **Efectivo esperado**
   * **Tarjetas / POS Transbank**
   * **Transferencias bancarias**
   * **Crédito Empresa / Guías Mensuales** (no se cobra dinero en mano)
4. Ingresa el dinero real entregado por el chofer y confirma el cuadre.

---

### 3.2 Flujo del Repartidor (En Calle / Smartphone)

El módulo del repartidor está optimizado para su uso en la cabina del camión: diseño vertical ultracompacto, botones grandes pero estrechos, y sin información irrelevante.

#### Paso 1: Iniciar el Día
1. El chofer inicia sesión con su RUT/correo y contraseña desde el navegador del teléfono.
2. Entra a `/repartidor` donde verá de inmediato su **Hoja de Ruta del Día** con el camión asignado y el avance (ej. `0/12 entregas`).

#### Paso 2: Ejecutar la Secuencia de Paradas
1. Las paradas están agrupadas por Comuna y Sector.
2. Cada tarjeta muestra de forma clara:
   * **Número de orden:** `#{N}`
   * **Dirección completa sin cortes**
   * **Resumen de productos:** `4x 20L, 2x 10L, 1x Soda`
   * **Estado:** `Pend.` (Pendiente) o `Post.` (Postergado)
3. Al tocar una parada, se despliegan sus acciones de tamaño mínimo visible:
   * **Llamar:** Abre el marcador del teléfono con el número del cliente.
   * **Postergar:** Si el cliente no está en el momento pero se intentará más tarde, se presiona *Postergar*.
   * **Reportar:** Si hay un problema grave (ej. no contesta, dirección inaccesible), abre el formulario de reporte de incidencia.
   * **Entregar:** Abre el modal de confirmación de entrega.

#### Paso 3: Confirmar Entrega y Cobro
Al pulsar **"Entregar"**:
1. **Ajuste de Botellones:** Confirma cuántos botellones de 20L, 10L o Soda se entregaron físicamente (botones `-` y `+`).
2. **Agregar Productos Adicionales:** Si el cliente solicita algo extra en el momento (ej. una recarga adicional o un dispensador USB):
   * Selecciona el producto desde la lista desplegable.
   * Presiona **"+ Agregar"** y ajusta la cantidad.
   * El precio y total se actualizan automáticamente.
3. **Seleccionar Método de Pago:**
   * **Efectivo:** Dinero recibido en mano.
   * **Tarjeta:** Pago realizado en el POS Transbank.
   * **Transferencia:** Comprobante verificado.
   * **Guía / Crédito Mensual:** No se cobra dinero. Se abre automáticamente el modal de **Guía de Despacho** para ingresar el nombre del receptor, RUT y capturar la firma digital en pantalla.
4. **Presionar "Confirmar Entrega":**
   * La entrega se registra en la base de datos.
   * **Reordenamiento inteligente:** La parada recién entregada pasa automáticamente **al final abajo** con su check verde (`✓ #N`), manteniendo siempre en la parte superior las paradas que restan por entregar.

#### Paso 4: Final del Recorrido
* El chofer revisa su resumen diario en `/repartidor/cuadraturas` para saber exactamente cuánto dinero en efectivo debe entregar en la oficina central.

---

## 4. Trazabilidad y Sistema de Logs (Servidor Local)

El sistema cuenta con una arquitectura de logs diseñada para **cero impacto en CPU y memoria RAM**, ideal para computadores de oficina que operan como servidor local.

### 4.1 Principio de Funcionamiento
1. **Sin bloqueos en Node.js:** La aplicación web **nunca** escribe directamente en archivos de disco ni hace llamadas lentas de logging. Solo emite una línea JSON pura a `stdout`.
2. **Trace ID por petición:** Cada petición web recibe un identificador único correlativo (`x-trace-id`) presente en las cabeceras HTTP y en los logs.
3. **Fluent Bit (Recolector Asíncrono):** Un proceso ligero e independiente lee la salida estándar y la guarda en `./logs/archive/sigo_operations.log`.
4. **Rotación automática:** Los logs se rotan y limpian periódicamente para evitar que se llene el disco duro.

### 4.2 Formato del Log Estructurado
```json
{
  "timestamp": "2026-10-17T02:15:33.132Z",
  "trace_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "method": "GET",
  "url": "/admin/rutas",
  "status": 200,
  "duration_ms": 3.42,
  "userId": "authenticated_session"
}
```

---

## 5. Puesta en Marcha y Comandos Útiles

### 5.1 Requisitos Previos
* [Node.js](https://nodejs.org/) v20 o superior.
* Servidor [MySQL](https://www.mysql.com/) en ejecución.
* [Fluent Bit](https://fluentbit.io/) (opcional pero recomendado para producción local).

### 5.2 Variables de Entorno (`.env`)
Configura las credenciales mínimas en tu archivo `.env`:
```env
DATABASE_URL="mysql://usuario:password@localhost:3306/sigo_sodatal"
BETTER_AUTH_SECRET="tu_secreto_super_seguro"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5.3 Comandos Principales
```bash
# Instalar dependencias
npm install

# Sincronizar esquema de base de datos
npx prisma db push

# Levantar en modo desarrollo
npm run dev

# Compilar para producción local
npm run build

# Iniciar servidor en producción redirigiendo logs para Fluent Bit
npm run start > ./logs/app-stdout.log 2>&1

# Iniciar Fluent Bit en el servidor local
fluent-bit -c fluent-bit.conf
```

### 5.4 Mantenimiento de Logs en Windows (PowerShell)
Para rotar logs y eliminar archivos de más de 14 días automáticamente:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\rotate-logs.ps1
```
*(Puedes programar este script en el Programador de Tareas de Windows para que se ejecute a las 00:00 hrs de cada día).*
