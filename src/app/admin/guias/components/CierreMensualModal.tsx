'use client';

import React, { useState } from 'react';
import { exportarCierreMensualAction } from '../actions';

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

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function CierreMensualModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [generando, setGenerando] = useState(false);

  if (!isOpen) return null;

  const generar = async () => {
    setGenerando(true);
    const res = await exportarCierreMensualAction(mes, anio);
    setGenerando(false);
    
    // Ajustamos la lógica a lo que realmente devuelve la acción optimizada
    if (res.success) {
      // Nota: Si ya no generamos SQL en el backend, la lógica de descarga cambiaría.
      // Si aún necesitas descargar el SQL, asegúrate de que exportarCierreMensualAction lo devuelva.
      
      alert(
        `Cierre generado: ${res.count} guía(s) procesadas correctamente.`
      );
      onSuccess();
    } else {
      alert(res.message || 'No se pudo generar el cierre.');
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="bg-purple-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-bold">🧾 Cierre Mensual de Crédito</h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200 font-bold">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-600">
            Agrupa todas las guías <strong>ENTREGADA_CREDITO</strong> de clientes con modalidad{' '}
            <strong>MENSUAL</strong> emitidas en el periodo que aún no se hayan cerrado, genera el SQL
            consolidado por cliente para facturación, y las marca como <strong>incluidas en el cierre</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5 uppercase">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generar}
            disabled={generando}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded shadow-sm mt-2 disabled:opacity-50 transition-colors text-sm"
          >
            {generando ? 'Generando...' : '📥 Generar y Descargar SQL'}
          </button>
        </div>
      </div>
    </div>
  );
}
