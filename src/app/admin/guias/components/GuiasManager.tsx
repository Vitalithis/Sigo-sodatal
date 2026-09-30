'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NuevaGuiaModal from './NuevaGuiaModal';
import AnularGuiaModal from './AnularGuiaModal';
import CierreMensualModal from './CierreMensualModal';
import { exportarGuiaSQLAction } from '../actions'; 
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  Download, 
  Ban, 
  FileText, 
  DollarSign, 
  CreditCard, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

const ESTADO_STYLES: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENTREGADA_TARJETA: 'bg-[#013299]/10 text-[#013299] border-blue-200',
  ENTREGADA_CREDITO: 'bg-amber-50 text-amber-700 border-amber-200',
  ANULADA: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ESTADO_LABELS: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'Entregada (Efectivo)',
  ENTREGADA_TARJETA: 'Entregada (Tarjeta)',
  ENTREGADA_CREDITO: 'Entregada (Crédito)',
  ANULADA: 'Anulada',
};

function descargarSQL(sql: string, filename: string) {
  const blob = new Blob([sql], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function GuiasManager({ initialGuias }: { initialGuias: any[] }) {
  const router = useRouter();
  const { popup, showSuccess, showError, close } = usePopup();

  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [modalNueva, setModalNueva] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [guiaAnular, setGuiaAnular] = useState<any>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const refrescar = () => {
    setModalNueva(false);
    setModalCierre(false);
    setGuiaAnular(null);
    router.refresh();
  };

  const guiasFiltradas = useMemo(() => {
    return initialGuias.filter((g) => {
      if (filtroEstado !== 'TODOS' && g.estado !== filtroEstado) return false;
      if (filtroCliente.trim() && !g.cliente?.nombre?.toLowerCase().includes(filtroCliente.toLowerCase()))
        return false;
      const fecha = new Date(g.fecha_emision);
      if (filtroDesde && fecha < new Date(filtroDesde)) return false;
      if (filtroHasta && fecha > new Date(filtroHasta + 'T23:59:59')) return false;
      return true;
    });
  }, [initialGuias, filtroEstado, filtroCliente, filtroDesde, filtroHasta]);

  // Metricas rápidas
  const totalFiltrado = useMemo(() => {
    return guiasFiltradas
      .filter((g) => g.estado !== 'ANULADA')
      .reduce((acc, g) => acc + g.total, 0);
  }, [guiasFiltradas]);

  const guiasCreditoCount = useMemo(() => {
    return guiasFiltradas.filter((g) => g.estado === 'ENTREGADA_CREDITO').length;
  }, [guiasFiltradas]);

  const guiasAnuladasCount = useMemo(() => {
    return guiasFiltradas.filter((g) => g.estado === 'ANULADA').length;
  }, [guiasFiltradas]);

  const exportarGuia = async (id: string) => {
    setExportando(id);
    const res = await exportarGuiaSQLAction(id);
    setExportando(null);
    if (res.success && res.sql && res.filename) {
      descargarSQL(res.sql, res.filename);
      showSuccess('Exportación Exitosa', `Guía exportada correctamente como ${res.filename}`);
    } else {
      showError('Error de Exportación', res.message || 'Error al exportar la guía.');
    }
  };

  const limpiarFiltros = () => {
    setFiltroEstado('TODOS');
    setFiltroCliente('');
    setFiltroDesde('');
    setFiltroHasta('');
  };

  const hayFiltrosActivos = filtroEstado !== 'TODOS' || filtroCliente !== '' || filtroDesde !== '' || filtroHasta !== '';

  return (
    <div className="space-y-6">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Guías</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasFiltradas.length}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Total</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${totalFiltrado.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guías Crédito</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasCreditoCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anuladas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasAnuladasCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Main Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Filters area */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search client input */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
              />
            </div>

            {/* Filter by Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#013299] transition-all"
            >
              <option value="TODOS">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Date Range filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                title="Fecha desde"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                title="Fecha hasta"
              />
            </div>

            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="Limpiar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setModalCierre(true)}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Cierre Mensual
            </button>

            <button
              onClick={() => setModalNueva(true)}
              className="px-4 py-2.5 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#013299]/20 hover:shadow-none flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Guía
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">N° Guía</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Repartidor</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {guiasFiltradas.length > 0 ? (
                guiasFiltradas.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#013299]">
                      #{g.numero_correlativo}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {new Date(g.fecha_emision).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{g.cliente?.nombre || 'S/N'}</span>
                      {g.direccion_entrega && (
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">{g.direccion_entrega}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {g.usuario_repartidor ? `${g.usuario_repartidor.nombre} ${g.usuario_repartidor.apellido || ''}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${ESTADO_STYLES[g.estado] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {ESTADO_LABELS[g.estado] || g.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                      ${g.total?.toLocaleString('es-CL')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => exportarGuia(g.id)}
                          disabled={exportando === g.id}
                          className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#013299] rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1"
                          title="Exportar SQL"
                        >
                          <Download className="w-3.5 h-3.5" />
                          SQL
                        </button>

                        {g.estado !== 'ANULADA' && (
                          <button
                            onClick={() => setGuiaAnular(g)}
                            className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1"
                            title="Anular Guía"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">No se encontraron guías de despacho</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros de búsqueda</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevaGuiaModal isOpen={modalNueva} onClose={() => setModalNueva(false)} onSuccess={refrescar} />
      <AnularGuiaModal guia={guiaAnular} isOpen={!!guiaAnular} onClose={() => setGuiaAnular(null)} onSuccess={refrescar} />
      <CierreMensualModal isOpen={modalCierre} onClose={() => setModalCierre(false)} onSuccess={refrescar} />
    </div>
  );
}
