'use client';

import { useState, useEffect } from 'react';
import { obtenerHistorialClienteAction } from '@/app/admin/clientes/actions';
import { ShoppingBag, Calendar, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  cliente: any;
}

export default function TabHistorialCompras({ cliente }: Props) {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<any[]>([]);

  useEffect(() => {
    async function cargarHistorial() {
      setLoading(true);
      const res = await obtenerHistorialClienteAction(cliente.id);
      if (res.success && res.cliente?.pedidos) {
        setPedidos(res.cliente.pedidos);
      }
      setLoading(false);
    }
    cargarHistorial();
  }, [cliente.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#013299]" /> Historial de Pedidos y Recargas
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Registro cronológico de productos y recargas adquiridas por el cliente.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold text-xs animate-pulse">
          Cargando historial de compras...
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-xs">Sin compras ni pedidos registrados</p>
          <p className="text-[11px] text-slate-400">Este cliente aún no ha registrado guías de despacho o recargas en el sistema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => {
            const fechaStr = new Date(pedido.fecha_solicitada || pedido.created_at).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div key={pedido.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {fechaStr}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    pedido.estado === 'ENTREGADO' || pedido.estado === 'COMPLETADO'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {pedido.estado || 'COMPLETADO'}
                  </span>
                </div>

                {/* Ítems del pedido */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                  {pedido.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between items-center text-xs font-semibold text-slate-800">
                      <span className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-[#013299]" />
                        {it.producto?.nombre || 'Producto'}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-extrabold text-[#013299]">
                        x{it.cantidad}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 font-bold">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">Monto Total Pedido:</span>
                  <span className="text-sm font-black text-slate-900">
                    ${Number(pedido.total || 0).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
