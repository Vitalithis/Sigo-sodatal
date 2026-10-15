import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import { Package, Truck, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export const metadata = {
  title: 'Stock en Camión - Repartidor SODATAL',
  description: 'Control de inventario y productos cargados en el vehículo.',
};

export default async function StockCamionPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect('/login');

  const stockCamion = await prisma.stockCamion.findMany({
    where: { usuario_id: usuario.id },
    include: { producto: true },
  });

  const vehiculo = usuario.vehiculo_id 
    ? await prisma.vehiculo.findUnique({ where: { id: usuario.vehiculo_id } })
    : null;

  const totalUnidades = stockCamion.reduce((acc, s) => acc + s.cantidad, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Cabecera de la sección */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-[#013299] rounded-2xl">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Stock Cargado en Camión</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {vehiculo ? `Camión ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})` : 'Inventario asignado para reparto'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <Layers className="w-5 h-5 text-[#013299]" />
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Total Unidades</span>
            <span className="text-lg font-black text-slate-900">{totalUnidades} cargadas</span>
          </div>
        </div>
      </div>

      {/* Grid de Productos Responsivo (1 col en móvil, 2 en tablet, 3 en PC) */}
      {stockCamion.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Sin Stock Registrado en Camión</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No se han cargado productos en el inventario de tu camión para la jornada de hoy. Acércate a despacho para realizar la carga inicial.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stockCamion.map((item) => {
            const esBajoStock = item.cantidad <= (item.producto.stock_minimo || 5);
            return (
              <div 
                key={item.id} 
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
              >
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">{item.producto.nombre}</h3>
                  <p className="text-xs text-slate-500 font-medium capitalize mt-1">
                    Categoría: {item.producto.categoria.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Precio recarga: ${(item.producto.precio_recarga || 0).toLocaleString('es-CL')}
                  </p>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <span className={`text-2xl sm:text-3xl font-black px-4 py-2 rounded-2xl block tracking-tight ${
                    esBajoStock 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-blue-50 text-[#013299] border border-blue-200'
                  }`}>
                    {item.cantidad}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                    Unidades
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs text-slate-600 flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-[#013299] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800 block">Sincronización de Stock en Ruta</span>
          <p className="leading-relaxed">
            Las cantidades se descuentan automáticamente al momento de confirmar cada entrega en la Hoja de Ruta. Para solicitar recarga adicional de fábrica, coordina con la oficina de despacho.
          </p>
        </div>
      </div>

    </div>
  );
}
