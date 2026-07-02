'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NuevaGuiaModal from './NuevaGuiaModal';
import ConfirmarEntregaModal from './ConfirmarEntregaModal';
import AnularGuiaModal from './AnularGuiaModal';
import CierreMensualModal from './CierreMensualModal';
import { exportarGuiaSQLAction } from './actions';

const ESTADO_STYLES: Record<string, string> = {
  EMITIDA: 'bg-blue-100 text-blue-700 border-blue-300',
  ENTREGADA_PAGADA: 'bg-green-100 text-green-700 border-green-300',
  ENTREGADA_CREDITO: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  FACTURADA: 'bg-purple-100 text-purple-700 border-purple-300',
  ANULADA: 'bg-red-100 text-red-700 border-red-300',
};

const ESTADO_LABELS: Record<string, string> = {
  EMITIDA: 'Emitida',
  ENTREGADA_PAGADA: 'Entregada (Pagada)',
  ENTREGADA_CREDITO: 'Entregada (Crédito)',
  FACTURADA: 'Facturada',
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

  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [modalNueva, setModalNueva] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [guiaEntrega, setGuiaEntrega] = useState<any>(null);
  const [guiaAnular, setGuiaAnular] = useState<any>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const refrescar = () => {
    setModalNueva(false);
    setModalCierre(false);
    setGuiaEntrega(null);
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

  const totalFiltrado = guiasFiltradas.reduce((acc, g) => acc + g.total, 0);

  const exportarGuia = async (id: string) => {
    setExportando(id);
    const res = await exportarGuiaSQLAction(id);
    setExportando(null);
    if (res.success && res.sql) {
      descargarSQL(res.sql, res.filename!);
    } else {
      alert(res.message || 'Error al exportar.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="TODOS">Todos</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Cliente</label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Buscar..."
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Desde</label>
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Hasta</label>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalCierre(true)}
            className="bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 font-semibold text-sm px-3 py-2 rounded"
          >
            🧾 Cierre Mensual
          </button>
          <button
            onClick={() => setModalNueva(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded shadow-sm"
          >
            + Nueva Guía
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          <strong className="text-gray-800">{guiasFiltradas.length}</strong> guía(s) en el filtro actual
        </span>
        <span>
          Total: <strong className="text-gray-800">${totalFiltrado.toLocaleString('es-CL')}</strong>
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">N°</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Repartidor</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-right p-3">Total</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {guiasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400 text-sm">
                  No hay guías que coincidan con el filtro.
                </td>
              </tr>
            )}
            {guiasFiltradas.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono font-bold text-gray-700">#{g.numero_correlativo}</td>
                <td className="p-3 text-gray-600">
                  {new Date(g.fecha_emision).toLocaleDateString('es-CL')}
                </td>
                <td className="p-3">
                  <div className="font-medium text-gray-800">{g.cliente?.nombre}</div>
                  <div className="text-[11px] text-gray-400">{g.direccion_entrega}</div>
                </td>
                <td className="p-3 text-gray-600">
                  {g.usuario_repartidor?.nombre} {g.usuario_repartidor?.apellido || ''}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold border ${ESTADO_STYLES[g.estado]}`}
                  >
                    {ESTADO_LABELS[g.estado]}
                  </span>
                </td>
                <td className="p-3 text-right font-bold text-gray-800">
                  ${g.total.toLocaleString('es-CL')}
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-1 flex-wrap">
                    {g.estado === 'EMITIDA' && (
                      <button
                        onClick={() => setGuiaEntrega(g)}
                        className="text-[11px] bg-green-50 text-green-700 border border-green-300 px-2 py-1 rounded font-semibold hover:bg-green-100"
                      >
                        ✅ Entregar
                      </button>
                    )}
                    {(g.estado === 'EMITIDA' || g.estado === 'ENTREGADA_PAGADA' || g.estado === 'ENTREGADA_CREDITO') && (
                      <button
                        onClick={() => setGuiaAnular(g)}
                        className="text-[11px] bg-red-50 text-red-700 border border-red-300 px-2 py-1 rounded font-semibold hover:bg-red-100"
                      >
                        🚫 Anular
                      </button>
                    )}
                    <button
                      onClick={() => exportarGuia(g.id)}
                      disabled={exportando === g.id}
                      className="text-[11px] bg-gray-50 text-gray-700 border border-gray-300 px-2 py-1 rounded font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                      {exportando === g.id ? '...' : '📥 SQL'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NuevaGuiaModal isOpen={modalNueva} onClose={() => setModalNueva(false)} onSuccess={refrescar} />
      <ConfirmarEntregaModal
        guia={guiaEntrega}
        isOpen={!!guiaEntrega}
        onClose={() => setGuiaEntrega(null)}
        onSuccess={refrescar}
      />
      <AnularGuiaModal
        guia={guiaAnular}
        isOpen={!!guiaAnular}
        onClose={() => setGuiaAnular(null)}
        onSuccess={refrescar}
      />
      <CierreMensualModal isOpen={modalCierre} onClose={() => setModalCierre(false)} onSuccess={refrescar} />
    </div>
  );
}
