# SIGO-Sodatal
> **Sistema Integral de Gestión Operacional y Logística de Última Milla**  
> Plataforma web para la gestión de rutas, distribución de agua purificada/soda, control de envases, guías de despacho y cuadraturas de caja.

---

## 📖 Documentación y Manual de Usuario
Para conocer en profundidad cómo está compuesto el sistema, la arquitectura técnica y el paso a paso de uso para administradores y repartidores, consulta el documento principal:

👉 **[MANUAL_SISTEMA.md](./MANUAL_SISTEMA.md)**

---

## 🚀 Inicio Rápido (Desarrollo)

### 1. Requisitos
* **Node.js**: v20 o superior
* **MySQL**: Servidor local o remoto activo
* **npm**: Gestor de paquetes

### 2. Instalación y Configuración
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (crear .env basado en las credenciales locales)
# DATABASE_URL="mysql://root:password@localhost:3306/sigo_sodatal"
# BETTER_AUTH_SECRET="tu_clave_secreta"
# BETTER_AUTH_URL="http://localhost:3000"

# 3. Sincronizar esquema de base de datos
npx prisma db push

# 4. Iniciar en modo desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📦 Stack Tecnológico
* **Frontend & Backend**: Next.js 14 (App Router) + React 18 + TypeScript
* **Estilos**: Tailwind CSS 3
* **Base de Datos**: MySQL + Prisma ORM 6
* **Autenticación**: Better Auth
* **Observabilidad**: Pino (JSON stdout) + Fluent Bit (colector local ligero)

---

## 🛠️ Arquitectura de Módulos
* **`/admin`**: Panel web de administración (rutas, guías, clientes, stock, flota, cuadraturas).
* **`/repartidor`**: Interfaz optimizada para smartphone (hoja de ruta del día, confirmación de entregas, venta en ruta, cobros y firma digital).
* **`fluent-bit.conf`**: Configuración de recolección de logs de ultra-bajo consumo para servidores locales.
