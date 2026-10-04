'use client';

import React from 'react';
import { Printer, X, DollarSign, Users, Package, MapPin, Calendar } from 'lucide-react';

interface Props {
  clientes: any[];
  tituloReporte: string;
  onClose: () => void;
}

export default function ModalImpresion({ clientes, tituloReporte, onClose }: Props) {
  const totalDeuda = clientes.reduce((acc, c) => acc + (c.deuda || 0), 0);
  const totalEnvases = clientes.reduce((acc, c) => acc + (c.botellones_prestados || 0), 0);
  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto !m-0 !top-0 !left-0 !right-0 !bottom-0">
      
      {/* Contenedor principal modal / documento imprimible */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Cabecera modal (Se oculta al imprimir) */}
        <div className="p-4 bg-[#013299] text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-300" />
            <h2 className="text-sm font-bold">Vista de Impresión / Reporte</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all"
            >
              <Printer className="w-4 h-4" /> Imprimir Documento (PDF)
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA IMPRIMIBLE (documento completo) */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 print:p-4 print:overflow-visible print:space-y-4">
          
          {/* Encabezado Corporativo SODATAL */}
          <div className="border-b-2 border-[#013299] pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#013299] tracking-tight uppercase">SODATAL</span>
                <span className="bg-blue-100 text-[#013299] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Agua & Soda Purificada
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">Sistema de Gestión y Control de Clientes</p>
            </div>
            <div className="text-right">
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{tituloReporte}</h1>
              <p className="text-[11px] text-slate-500 flex items-center justify-end gap-1 font-medium mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Emisión: {fechaHoy}
              </p>
            </div>
          </div>

          {/* Tarjetas de Resumen del Reporte */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clientes</span>
              <span className="text-xl font-black text-slate-900">{clientes.length}</span>
            </div>
            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Deuda Pendiente Total</span>
              <span className="text-xl font-black text-rose-700">${totalDeuda.toLocaleString('es-CL')}</span>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-center">
              <span className="text-[10px] font-bold text-[#013299] uppercase tracking-wider block">Envases Prestados</span>
              <span className="text-xl font-black text-[#013299]">{totalEnvases} botellones</span>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px] print:bg-slate-200">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Cliente / Razón Social</th>
                  <th className="py-2.5 px-3">Dirección y Teléfono</th>
                  <th className="py-2.5 px-3">Sector / Comuna</th>
                  <th className="py-2.5 px-3 text-center">Frecuencia</th>
                  <th className="py-2.5 px-3 text-center">Envases</th>
                  <th className="py-2.5 px-3 text-right">Deuda ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                      No se encontraron clientes para mostrar en este informe.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                      <td className="py-2 px-3 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {c.nombre}
                        {c.rut_empresa && <div className="text-[10px] font-normal text-slate-500">RUT: {c.rut_empresa}</div>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800">{c.direccion}</div>
                        <div className="text-[10px] text-slate-500">{c.telefono}</div>
                      </td>
                      <td className="py-2 px-3">
                        {c.sector ? (
                          <div>
                            <span className="font-semibold text-slate-800">{c.sector.nombre}</span>
                            <span className="text-[10px] text-slate-500 block">{c.sector.comuna?.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin Sector</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-bold uppercase text-[10px]">
                        {c.frecuencia === 'QUINCENAL' ? 'Quincenal' : c.frecuencia === 'MENSUAL' ? 'Mensual' : c.frecuencia === 'A_PEDIDO' ? 'A pedido' : 'Semanal'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {c.botellones_prestados || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-black">
                        {(c.deuda || 0) > 0 ? (
                          <span className="text-rose-700 font-black">${Number(c.deuda).toLocaleString('es-CL')}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Al día</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                    Totales Consolidados ({clientes.length} Clientes):
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs font-black">{totalEnvases}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-black text-rose-700">
                    ${totalDeuda.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pie de Firma / Observaciones al Imprimir */}
          <div className="pt-6 flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-100 print:pt-4">
            <div>
              <p className="font-bold text-slate-600">SODATAL - Distribución de Agua & Soda</p>
              <p>Documento interno generado desde el panel de administración.</p>
            </div>
            <div className="border-t border-slate-300 w-48 text-center pt-1 font-semibold text-slate-600 print:block hidden">
              Firma Responsable / Supervisión
            </div>
          </div>

        </div>

      </div>

      {/* CSS para forzar impresión limpia */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:static, .print\:static * {
            visibility: visible;
          }
          .print\:static {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
