'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NuevaGuiaModal from './NuevaGuiaModal';
import AnularGuiaModal from './AnularGuiaModal';
import CierreMensualModal from './CierreMensualModal';
// Importación corregida: sube un nivel hacia 'src/app/admin/guias/'
import { exportarGuiaSQLAction } from '../actions'; 

const ESTADO_STYLES: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'bg-green-100 text-green-700 border-green-300',
  ENTREGADA_TARJETA: 'bg-teal-100 text-teal-700 border-teal-300',
  ENTREGADA_CREDITO: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  ANULADA: 'bg-red-100 text-red-700 border-red-300',
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

  const totalFiltrado = guiasFiltradas.reduce((acc, g) => acc + g.total, 0);

  const exportarGuia = async (id: string) => {
    setExportando(id);
    const res = await exportarGuiaSQLAction(id);
    setExportando(null);
    if (res.success && res.sql && res.filename) {
      descargarSQL(res.sql, res.filename);
    } else {
      alert(res.message || 'Error al exportar.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-2 items-end">
          {/* ... Tus selects e inputs de filtro ... */}
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
             <option value="TODOS">Todos</option>
             {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalCierre(true)} className="bg-purple-100 text-purple-700 px-3 py-2 rounded text-sm font-semibold">🧾 Cierre</button>
          <button onClick={() => setModalNueva(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">+ Nueva Guía</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3 text-left">N°</th>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {guiasFiltradas.map((g) => (
              <tr key={g.id}>
                <td className="p-3 font-bold">#{g.numero_correlativo}</td>
                <td className="p-3">{new Date(g.fecha_emision).toLocaleDateString()}</td>
                <td className="p-3">{g.cliente?.nombre}</td>
                <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ESTADO_STYLES[g.estado]}`}>
                        {ESTADO_LABELS[g.estado]}
                    </span>
                </td>
                <td className="p-3 text-right">${g.total.toLocaleString('es-CL')}</td>
                <td className="p-3 text-center">
                    <button onClick={() => exportarGuia(g.id)} disabled={exportando === g.id} className="text-[11px] bg-gray-50 border px-2 py-1 rounded">
                        {exportando === g.id ? '...' : '📥 SQL'}
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NuevaGuiaModal isOpen={modalNueva} onClose={() => setModalNueva(false)} onSuccess={refrescar} />
      <AnularGuiaModal guia={guiaAnular} isOpen={!!guiaAnular} onClose={() => setGuiaAnular(null)} onSuccess={refrescar} />
      <CierreMensualModal isOpen={modalCierre} onClose={() => setModalCierre(false)} onSuccess={refrescar} />
    </div>
  );
}