import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import Link from 'next/link';
import { Navigation, CheckCircle2, AlertTriangle, Clock, MapPin, Phone, ArrowRight, Package, ShieldAlert } from 'lucide-react';

export default async function RepartidorDashboard() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4);
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  // Obtener ruta del día para este repartidor
  const ruta = await prisma.rutaDia.findFirst({
    where: {
      usuario_id: usuario.id,
      fecha: { gte: inicioDia, lte: finDia },
      estado: 'ACTIVA',
    },
    include: {
      paradas: {
        orderBy: { orden: 'asc' },
        include: {
          cliente: {
            include: {
              incidencias: { where: { resuelta: false } },
            },
          },
          pedido: {
            include: { items: { include: { producto: true } } }
          }
        },
      },
    },
  });

  // Stock en camión
  const stockCamion = await prisma.stockCamion.findMany({
    where: { usuario_id: usuario.id },
    include: { producto: true },
  });

  const totalParadas = ruta?.paradas.length || 0;
  const completadas = ruta?.paradas.filter(p => p.estado === 'ENTREGADO').length || 0;
  const postergadas = ruta?.paradas.filter(p => p.estado === 'POSTERGADO').length || 0;
  const pendientes = ruta?.paradas.filter(p => p.estado === 'PENDIENTE').length || 0;
  const porcentaje = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0;

  // Siguiente parada pendiente
  const siguienteParada = ruta?.paradas.find(p => p.estado === 'PENDIENTE');

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Saludo al Repartidor */}
      <div className="bg-gradient-to-r from-[#013299] to-blue-800 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Panel de Reparto</p>
          <h1 className="text-xl font-black mt-0.5">¡Hola, {usuario.nombre.split(' ')[0]}! 👋</h1>
          <p className="text-xs text-blue-100/90 mt-1">
            {totalParadas > 0 
              ? `Tienes ${pendientes} paradas pendientes de un total de ${totalParadas}.` 
              : 'No tienes hoja de ruta activa asignada para la jornada de hoy.'}
          </p>

          {totalParadas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Avance de la Ruta</span>
                <span>{porcentaje}% ({completadas}/{totalParadas})</span>
              </div>
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <Navigation className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
      </div>

      {/* Tarjeta de Acción Principal: IR A MI RUTA */}
      {totalParadas > 0 ? (
        <Link
          href="/repartidor/ruta"
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white p-4 rounded-2xl shadow-md flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Ir a Hoja de Ruta</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Ver secuencia y entregar pedidos</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 shrink-0" />
        </Link>
      ) : (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Sin Ruta Asignada</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Contacta a la oficina de despacho para que asignen tu ruta base o pedidos del día.
          </p>
        </div>
      )}

      {/* Siguiente Parada Destacada */}
      {siguienteParada && (
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-[11px] font-black text-[#013299] uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#013299]" /> Siguiente Entrega (#{siguienteParada.orden})
            </span>
            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              Pendiente
            </span>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm">{siguienteParada.cliente.nombre}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{siguienteParada.cliente.direccion}</p>
          </div>

          {/* Advertencias de Incidencias o Deuda */}
          {siguienteParada.cliente.deuda > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-center justify-between font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" /> Deuda registrada:
              </span>
              <span className="font-black text-rose-700">${siguienteParada.cliente.deuda.toLocaleString('es-CL')}</span>
            </div>
          )}

          {/* Botones de acción rápida: Llamar y GPS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={`tel:${siguienteParada.cliente.telefono}`}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600" /> Llamar Cliente
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siguienteParada.cliente.direccion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#013299] text-xs font-bold py-2.5 rounded-xl border border-blue-200 transition-colors"
            >
              <MapPin className="w-4 h-4 text-[#013299]" /> Ver en Mapa
            </a>
          </div>
        </div>
      )}

      {/* Resumen de Estado de la Jornada */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Entregadas</span>
          <span className="text-lg font-black text-slate-900">{completadas}</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pendientes</span>
          <span className="text-lg font-black text-slate-900">{pendientes}</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Postergadas</span>
          <span className="text-lg font-black text-slate-900">{postergadas}</span>
        </div>
      </div>

      {/* Inventario Rápido del Camión */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#013299]" /> Stock Cargado en Camión
          </span>
          <Link href="/repartidor/stock" className="text-[11px] font-bold text-[#013299] hover:underline">
            Ver detalle
          </Link>
        </div>

        {stockCamion.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin registro de stock en camión.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stockCamion.map(s => (
              <div key={s.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 truncate pr-1">{s.producto.nombre}</span>
                <span className="bg-[#013299] text-white text-xs font-black px-2 py-0.5 rounded-md shrink-0">
                  {s.cantidad}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
