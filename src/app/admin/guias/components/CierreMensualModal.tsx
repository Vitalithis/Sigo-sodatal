'use client';

import React, { useState } from 'react';
import { exportarCierreMensualAction } from '../actions';
import { FileSpreadsheet, X, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

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
  const { popup, showSuccess, showError, close } = usePopup();
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [generando, setGenerando] = useState(false);

  if (!isOpen) return null;

  const generar = async () => {
    setGenerando(true);
    const res = await exportarCierreMensualAction(mes, anio);
    setGenerando(false);
    
    if (res.success) {
      showSuccess('Cierre Generado', `Cierre procesado exitosamente: ${res.count} guía(s) incluidas.`);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      showError('Error de Cierre', res.message || 'No se pudo generar el cierre mensual.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <PopupGlobal popup={popup} onClose={close} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-purple-700 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cierre Mensual de Crédito</h3>
              <p className="text-xs text-purple-200">Consolidación de guías para facturación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-purple-50/70 border border-purple-100 p-3.5 rounded-xl text-xs text-purple-900 leading-relaxed">
            Agrupa todas las guías en estado <span className="font-bold text-purple-900">ENTREGADA_CREDITO</span> de clientes con modalidad <span className="font-bold text-purple-900">MENSUAL</span> emitidas en el período seleccionado y las marca como <span className="font-bold text-purple-900">incluidas en el cierre</span>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Año
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={generar}
              disabled={generando}
              className="w-2/3 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-purple-700/20 hover:shadow-none transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              {generando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando Cierre...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generar Cierre
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
