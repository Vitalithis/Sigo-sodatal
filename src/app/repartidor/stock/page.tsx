import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import { prisma } from '@lib/prisma';
import { Package, Truck, AlertCircle, RefreshCw } from 'lucide-react';

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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Cabecera de la sección */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#013299] rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base">Stock en Camión</h1>
            <p className="text-xs text-slate-500 font-medium">
              {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})` : 'Inventario asignado'}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Inventario de Productos */}
      <div className="space-y-3">
        {stockCamion.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Sin Stock Registrado</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No se han cargado productos en el inventario de tu camión para la jornada de hoy.
            </p>
          </div>
        ) : (
          stockCamion.map((item) => {
            const esBajoStock = item.cantidad <= (item.producto.stock_minimo || 5);
            return (
              <div 
                key={item.id} 
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{item.producto.nombre}</h3>
                  <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
                    Categoría: {item.producto.categoria.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Precio recarga: ${(item.producto.precio_recarga || 0).toLocaleString('es-CL')}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-black px-3.5 py-1.5 rounded-xl block ${
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
          })
        )}
      </div>

      {/* Nota de Reabastecimiento */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-2.5">
        <RefreshCw className="w-4 h-4 text-[#013299] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Las cantidades se descuentan automáticamente al confirmar entregas en la Hoja de Ruta. Para solicitar recarga de fábrica, contacta a la administración.
        </p>
      </div>

    </div>
  );
}
