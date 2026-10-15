'use client';

import React, { useState, useEffect } from 'react';
import { anularGuiaAction } from '../actions';
import { Ban, X, AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

const MOTIVOS_PREDETERMINADOS = [
  'Error en cantidades',
  'Error en datos del cliente',
  'Error en precio/producto',
  'Duplicada',
  'Despacho no realizado',
  'Otro',
];

interface AnularGuiaModalProps {
  guia: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (guiaAnulada?: any, accion?: 'CERRAR' | 'CREAR_REEMPLAZO') => void;
}

export default function AnularGuiaModal({
  guia,
  isOpen,
  onClose,
  onSuccess,
}: AnularGuiaModalProps) {
  const { popup, showError, close } = usePopup();
  const [opcionMotivo, setOpcionMotivo] = useState(MOTIVOS_PREDETERMINADOS[0]);
  const [motivoLibre, setMotivoLibre] = useState('');
  const [confirmacionFactura, setConfirmacionFactura] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [anulacionExitosa, setAnulacionExitosa] = useState(false);
  const [guiaResultado, setGuiaResultado] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setOpcionMotivo(MOTIVOS_PREDETERMINADOS[0]);
      setMotivoLibre('');
      setConfirmacionFactura(false);
      setGuardando(false);
      setAnulacionExitosa(false);
      setGuiaResultado(null);
    }
  }, [isOpen, guia]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen || !guia) return null;

  const esYaAnulada = guia.estado === 'ANULADA' || guia.estado_documento === 'ANULADA';
  const tieneFactura = !!guia.numero_factura;

  const getMotivoFinal = () => {
    if (opcionMotivo === 'Otro') {
      return motivoLibre.trim();
    }
    return opcionMotivo;
  };

  const handleAnular = async (e: React.FormEvent) => {
    e.preventDefault();

    if (esYaAnulada) {
      showError('Documento Anulado', 'Esta guía ya se encuentra anulada.');
      return;
    }

    const motivoFinal = getMotivoFinal();
    if (!motivoFinal || motivoFinal.length < 5) {
      showError('Motivo Requerido', 'Debes ingresar un motivo de al menos 5 caracteres.');
      return;
    }

    if (tieneFactura && !confirmacionFactura) {
      showError(
        'Confirmación Obligatoria',
        'Esta guía ya tiene factura emitida. Debes confirmar explícitamente que la corrección tributaria se hará con Nota de Crédito.'
      );
      return;
    }

    setGuardando(true);
    const res = await anularGuiaAction(guia.id, motivoFinal, confirmacionFactura);
    setGuardando(false);

    if (res.success) {
      setAnulacionExitosa(true);
      setGuiaResultado(res.guia || guia);
    } else {
      showError('Error de Anulación', res.message || 'No se pudo anular la guía.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <PopupGlobal popup={popup} onClose={close} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        
        {/* Header Modal */}
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Anular Comprobante #{String(guia.numero_correlativo).padStart(6, '0')}
              </h3>
              <p className="text-xs text-rose-100">Documento interno de control de entrega</p>
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

        {/* Caso: Anulación Exitosa con opción de crear reemplazo */}
        {anulacionExitosa ? (
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-900">Guía Anulada Exitosamente</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  El comprobante #{String(guia.numero_correlativo).padStart(6, '0')} ha quedado registrado como <b>ANULADA</b> sin efecto tributario.
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  La firma y comprobación de entrega original quedan archivadas como respaldo.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-800">¿Deseas emitir un comprobante de reemplazo corregido?</p>
              <p className="text-slate-500">
                Puedes abrir el formulario pre-llenado con los datos de este cliente e ítems para corregir cantidades, productos o receptor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onSuccess(guiaResultado, 'CERRAR')}
                className="w-full sm:w-1/2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Solo Cerrar
              </button>
              <button
                type="button"
                onClick={() => onSuccess(guiaResultado, 'CREAR_REEMPLAZO')}
                className="w-full sm:w-1/2 bg-[#013299] hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-[#013299]/20 hover:shadow-none transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Crear reemplazo
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Anulación */
          <form onSubmit={handleAnular} className="p-6 space-y-4">
            
            {/* Resumen de la Guía */}
            <div className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-xl text-xs space-y-1 text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Detalles del comprobante:
              </div>
              <p><span className="font-semibold">Cliente:</span> {guia.cliente?.nombre || 'N/A'}</p>
              <p><span className="font-semibold">Total:</span> ${Number(guia.total || 0).toLocaleString('es-CL')}</p>
              {guia.firma_digital && (
                <p className="text-[11px] text-emerald-700 font-medium">✓ Cuenta con firma de entrega registrada (se mantendrá como prueba)</p>
              )}
            </div>

            {/* Advertencia si ya está facturada */}
            {tieneFactura && (
              <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Comprobante Facturado (Ref: #{guia.numero_factura})</span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Esta guía ya está facturada; la corrección tributaria requiere nota de crédito ante el SII.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1.5 border-t border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmacionFactura}
                    onChange={(e) => setConfirmacionFactura(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-amber-300"
                  />
                  <span className="text-[11px] font-semibold text-amber-950">
                    Entiendo y confirmo la anulación interna de esta entrega facturada.
                  </span>
                </label>
              </div>
            )}

            {/* Selector de Motivo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Motivo de Anulación <span className="text-rose-500">*</span>
              </label>
              <select
                value={opcionMotivo}
                onChange={(e) => setOpcionMotivo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-medium"
              >
                {MOTIVOS_PREDETERMINADOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Libre si seleccionó 'Otro' */}
            {opcionMotivo === 'Otro' && (
              <div className="animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detalla el Motivo <span className="text-rose-500">* (mín. 5 caracteres)</span>
                </label>
                <textarea
                  value={motivoLibre}
                  onChange={(e) => setMotivoLibre(e.target.value)}
                  rows={2}
                  placeholder="Describe la razón de la anulación..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  required
                  minLength={5}
                  autoFocus
                />
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || (tieneFactura && !confirmacionFactura)}
                className="w-2/3 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-600/20 hover:shadow-none transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Anulando...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Confirmar Anulación
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
