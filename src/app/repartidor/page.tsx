import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import Link from 'next/link';
import { 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  FileText, 
  Scale, 
  Package, 
  Truck,
  ArrowRight,
  Layers
} from 'lucide-react';
import ListaParadas from './ruta/components/ListaParadas';

export const metadata = {
  title: 'Mi Ruta - Repartidor SODATAL',
  description: 'Hoja de ruta y entregas del día para el repartidor.',
};

export default async function RepartidorDashboard() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const hoy = new Date();
  hoy.setHours(hoy.getHours() - 4);
  const fechaStr = hoy.toISOString().split('T')[0];
  const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
  const finDia = new Date(`${fechaStr}T23:59:59.999Z`);

  // Obtener ruta del día para este repartidor
  const [ruta, stockCamion, vehiculo] = await Promise.all([
    prisma.rutaDia.findFirst({
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
                sector: { include: { comuna: true } },
                incidencias: { where: { resuelta: false } },
              },
            },
            pedido: {
              include: { items: { include: { producto: true } } }
            }
          },
        },
      },
    }),
    prisma.stockCamion.findMany({
      where: { usuario_id: usuario.id },
      include: { producto: true },
    }),
    usuario.vehiculo_id 
      ? prisma.vehiculo.findUnique({ where: { id: usuario.vehiculo_id } })
      : Promise.resolve(null),
  ]);

  const totalParadas = ruta?.paradas.length || 0;
  const completadas = ruta?.paradas.filter(p => p.estado === 'ENTREGADO').length || 0;
  const postergadas = ruta?.paradas.filter(p => p.estado === 'POSTERGADO').length || 0;
  const pendientes = ruta?.paradas.filter(p => p.estado === 'PENDIENTE').length || 0;
  const porcentaje = totalParadas > 0 ? Math.round((completadas / totalParadas) * 100) : 0;
  const totalStockUnidades = stockCamion.reduce((acc, s) => acc + s.cantidad, 0);

  const fechaFormateada = hoy.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Barra Superior Compacta y No Invasiva */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        
        {/* Identificador y Estado de la Ruta */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#013299] rounded-xl shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                  Hoja de Ruta del Día
                </h1>
                {totalParadas > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    En Curso
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                <span className="capitalize">{fechaFormateada}</span>
                {vehiculo && <span> • Camión <strong className="text-slate-800">{vehiculo.patente}</strong></span>}
              </p>
            </div>
          </div>

          {/* Progreso Rápido */}
          {totalParadas > 0 && (
            <div className="sm:hidden text-right">
              <span className="text-sm font-black text-slate-900">
                {completadas}/{totalParadas}
              </span>
              <span className="text-[10px] font-bold text-slate-400 block">{porcentaje}%</span>
            </div>
          )}
        </div>

        {/* Progreso en PC */}
        {totalParadas > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-black bg-blue-50 text-[#013299] px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{completadas} de {totalParadas} paradas</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-extrabold">{porcentaje}%</span>
            </span>
          </div>
        )}

      </div>

      {/* Mini Barra de Progreso del Día */}
      {totalParadas > 0 && (
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      )}

      {/* Contenido Principal: LA RUTA DIRECTA Y CLARA */}
      {ruta && totalParadas > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Columna Principal (2 cols en LG): Paradas de la Ruta directamente */}
          <div className="lg:col-span-2">
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
              <ListaParadas paradasIniciales={ruta.paradas} usuarioId={usuario.id} />
            </div>
          </div>

          {/* Columna Lateral (1 col en LG): Resumen Compacto y Stock */}
          <div className="space-y-4">
            
            {/* Resumen de Estado */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Resumen de la Jornada
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Entregadas</span>
                  <span className="text-base font-black text-emerald-950 mt-0.5 block">{completadas}</span>
                </div>

                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 text-center">
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">Pendientes</span>
                  <span className="text-base font-black text-amber-950 mt-0.5 block">{pendientes}</span>
                </div>

                <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-center">
                  <span className="text-[10px] text-rose-800 font-bold uppercase block">Postergadas</span>
                  <span className="text-base font-black text-rose-950 mt-0.5 block">{postergadas}</span>
                </div>
              </div>
            </div>

            {/* Stock Rápido en Camión */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#013299]" /> Stock en Camión
                </span>
                <Link href="/repartidor/stock" className="text-xs font-bold text-[#013299] hover:underline flex items-center gap-1">
                  Ver todo <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {stockCamion.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">Sin registro de stock.</p>
              ) : (
                <div className="space-y-1.5">
                  {stockCamion.map(s => (
                    <div key={s.id} className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate pr-2">{s.producto.nombre}</span>
                      <span className="bg-[#013299] text-white font-black px-2 py-0.5 rounded-md text-[11px] shrink-0">
                        {s.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarjeta de Vehículo */}
            {vehiculo && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs">{vehiculo.marca} {vehiculo.modelo}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Odómetro: {vehiculo.kilometraje_actual.toLocaleString('es-CL')} km</p>
                  </div>
                </div>
                <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-1 rounded-lg">
                  {vehiculo.patente}
                </span>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* Estado cuando no hay ruta asignada hoy */
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-14 h-14 bg-blue-50 text-[#013299] rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Sin Ruta Asignada para Hoy</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              No tienes una hoja de ruta activa asignada para la jornada de hoy. Puedes consultar tus rutas anteriores o contactar a la oficina de despacho.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href="/repartidor/ruta"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#013299] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Ver Historial de Despachos</span>
            </Link>

            <Link
              href="/repartidor/stock"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Revisar Stock Camión</span>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
