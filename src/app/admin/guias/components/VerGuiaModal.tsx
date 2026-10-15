'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  PenTool, 
  FileText, 
  Calendar, 
  User, 
  Truck, 
  DollarSign, 
  MapPin, 
  Phone, 
  CreditCard,
  Loader2,
  Share2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import FirmaCanvas from './FirmaCanvas';
import { guardarFirmaGuiaAction, exportarGuiaSQLAction } from '../actions';
import { 
  generarHtmlGuiaIndividual, 
  descargarBlob, 
  descargarGuiaPDF, 
  obtenerEstadoDocumento, 
  obtenerFormaPagoLabel, 
  formatearFolio,
  esFirmaDataUrlValida 
} from '../utils/exportarDocumentosGuias';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface VerGuiaModalProps {
  guia: any | null;
  isOpen: boolean;
  onClose: () => void;
  onFirmaActualizada?: () => void;
}

export default function VerGuiaModal({
  guia,
  isOpen,
  onClose,
  onFirmaActualizada,
}: VerGuiaModalProps) {
  const { popup, showSuccess, showError, close } = usePopup();

  const [editandoFirma, setEditandoFirma] = useState(false);
  const [nuevaFirma, setNuevaFirma] = useState<string | null>(null);
  const [guardandoFirma, setGuardandoFirma] = useState(false);
  const [exportandoSQL, setExportandoSQL] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [guiaLocal, setGuiaLocal] = useState<any>(guia);

  React.useEffect(() => {
    if (isOpen && guia) {
      setGuiaLocal(guia);
      setEditandoFirma(false);
      setNuevaFirma(null);
      close();
    }
  }, [guia, isOpen]);

  const handleCerrar = () => {
    close();
    setEditandoFirma(false);
    setNuevaFirma(null);
    onClose();
  };

  // Cerrar modal con tecla Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !guiaLocal) return null;

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargarGuia = async () => {
    setGenerandoPDF(true);
    try {
      await descargarGuiaPDF(guiaLocal);
    } catch (err: any) {
      showError('Error de Descarga', 'No se pudo generar el documento PDF.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleDescargarSQL = async () => {
    setExportandoSQL(true);
    const res = await exportarGuiaSQLAction(guiaLocal.id);
    setExportandoSQL(false);
    if (res.success && res.sql && res.filename) {
      const blob = new Blob([res.sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('SQL Generado', `Descargado archivo ${res.filename}`);
    } else {
      showError('Error', res.message || 'No se pudo exportar el SQL.');
    }
  };

  const handleGuardarFirma = async () => {
    if (!nuevaFirma) {
      showError('Firma requerida', 'Debes dibujar la firma antes de guardar.');
      return;
    }

    setGuardandoFirma(true);
    const res = await guardarFirmaGuiaAction(guiaLocal.id, nuevaFirma);
    setGuardandoFirma(false);

    if (res.success) {
      showSuccess('Firma Guardada', 'La firma digital ha sido registrada en el comprobante.');
      setGuiaLocal((prev: any) => ({ ...prev, firma_digital: nuevaFirma }));
      setEditandoFirma(false);
      setNuevaFirma(null);
      if (onFirmaActualizada) onFirmaActualizada();
    } else {
      showError('Error al guardar firma', res.message || 'Ocurrió un error.');
    }
  };

  const esAnulada = obtenerEstadoDocumento(guiaLocal) === 'ANULADA';
  const tieneFirma = esFirmaDataUrlValida(guiaLocal.firma_digital);
  const formaPagoTexto = obtenerFormaPagoLabel(guiaLocal);

  const fechaEmision = new Date(guiaLocal.fecha_emision);
  const fechaFormateada = fechaEmision.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFormateada = fechaEmision.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const fechaRecepcionTexto = guiaLocal.hora_entrega
    ? new Date(guiaLocal.hora_entrega).toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${fechaFormateada} - ${horaFormateada} (fecha de emisión)`;

  const reemplazaA = guiaLocal.reemplaza_a?.numero_correlativo || guiaLocal.reemplaza_a_correlativo;
  const reemplazadaPor = guiaLocal.reemplazada_por?.numero_correlativo || guiaLocal.reemplazada_por_correlativo;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <PopupGlobal popup={popup} onClose={close} />
      
      <div className="bg-white w-full max-w-4xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* Barra Superior con Acciones Rápidas */}
        <div className="bg-[#013299] text-white px-6 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">
                  Comprobante de Entrega #{formatearFolio(guiaLocal.numero_correlativo)}
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${esAnulada ? 'bg-rose-500 text-white border-rose-400' : 'bg-emerald-500 text-white border-emerald-400'}`}>
                  {esAnulada ? 'ANULADA' : 'VIGENTE'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100">Documento interno de control de entrega</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarGuia}
              disabled={generandoPDF}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              title="Descargar Comprobante en formato PDF (.pdf)"
            >
              {generandoPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={handleImprimir}
              className="h-8 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm flex items-center gap-1.5"
              title="Imprimir documento oficial"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDescargarSQL}
              disabled={exportandoSQL}
              className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all backdrop-blur-sm flex items-center gap-1.5"
              title="Exportar respaldo en SQL"
            >
              {exportandoSQL ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">SQL</span>
            </button>

            <button
              onClick={handleCerrar}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA DEL DOCUMENTO */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-4 text-slate-900 font-sans print:rounded-none relative overflow-hidden">
            
            {/* Sello de Agua Diagonal si es ANULADA */}
            {esAnulada && (
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] text-[75px] font-black text-rose-500/15 border-8 border-rose-500/20 px-8 py-2 rounded-2xl tracking-[12px] pointer-events-none select-none uppercase z-10 whitespace-nowrap">
                ANULADA
              </div>
            )}

            {/* Encabezado: Logo Emisor vs Caja Folio Neutra */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-200">
              
              {/* Datos de SODATAL (Emisor) */}
              <div className="sm:col-span-7 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-[#013299] tracking-tight uppercase">SODATAL</span>
                  <span className="bg-blue-50 text-[#013299] border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    Control de Entrega
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">R.U.T.: 76.892.410-5</p>
                <p className="text-xs text-slate-500 leading-snug">
                  Giro: Elaboración de bebidas no alcohólicas
                </p>
                <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#013299]" />
                    Joaquín Prieto 289, Concepción, Chile
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-[#013299]" />
                    Teléfono: +56 9 5174 9928
                  </p>
                </div>
              </div>

              {/* Recuadro de Folio Neutro (Rojo solo si es ANULADA) */}
              <div className="sm:col-span-5 flex justify-center sm:justify-end">
                <div className={`rounded-xl p-3 sm:p-4 text-center w-full max-w-[260px] border-2 ${esAnulada ? 'border-red-600 bg-red-50/30' : 'border-[#0284c7] bg-sky-50/40'}`}>
                  <p className={`text-xs font-black uppercase my-0.5 tracking-wide ${esAnulada ? 'text-red-700' : 'text-[#0369a1]'}`}>
                    COMPROBANTE DE ENTREGA
                  </p>
                  <p className={`text-lg font-black font-mono ${esAnulada ? 'text-red-600' : 'text-[#0284c7]'}`}>
                    N° {formatearFolio(guiaLocal.numero_correlativo)}
                  </p>
                  <p className={`text-[10px] font-bold mt-1 ${esAnulada ? 'text-red-500' : 'text-sky-600'}`}>
                    {esAnulada ? 'DOCUMENTO ANULADO' : 'DOCUMENTO INTERNO'}
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso Destacado si es ANULADA */}
            {esAnulada && (
              <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-rose-800 uppercase text-xs flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Comprobante Anulado
                  </span>
                  {guiaLocal.anulada_at && (
                    <span className="text-[11px] text-rose-700 font-semibold">
                      Fecha: {new Date(guiaLocal.anulada_at).toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
                <p><b>Motivo de anulación:</b> {guiaLocal.anulada_motivo || guiaLocal.motivo_anulacion || 'Sin motivo registrado'}</p>
                {reemplazadaPor && (
                  <p className="font-bold text-blue-700 pt-0.5">
                    ➜ Reemplazada por comprobante N° #{formatearFolio(reemplazadaPor)}
                  </p>
                )}
              </div>
            )}

            {/* Datos del Receptor y Despacho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs border-b border-slate-200">
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Datos del Receptor</p>
                <p><span className="font-bold text-slate-700">Señor(es):</span> <span className="font-semibold text-slate-900">{guiaLocal.cliente?.nombre || 'Consumidor Final'}</span></p>
                <p><span className="font-bold text-slate-700">R.U.T. Empresa:</span> <span className="font-mono font-medium text-slate-800">{guiaLocal.cliente?.rut_empresa || 'S/RUT'}</span></p>
                <p><span className="font-bold text-slate-700">Giro:</span> {guiaLocal.cliente?.giro || 'Particular / Comercial'}</p>
                <p><span className="font-bold text-slate-700">Dirección:</span> {guiaLocal.direccion_entrega || guiaLocal.cliente?.direccion || '-'}</p>
                <p><span className="font-bold text-slate-700">Teléfono:</span> {guiaLocal.cliente?.telefono || '-'}</p>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detalles de la Entrega</p>
                <p><span className="font-bold text-slate-700">Fecha Emisión:</span> {fechaFormateada} - {horaFormateada}</p>
                <p><span className="font-bold text-slate-700">Repartidor:</span> {guiaLocal.usuario_repartidor ? `${guiaLocal.usuario_repartidor.nombre} ${guiaLocal.usuario_repartidor.apellido || ''}` : 'Asignado en ruta'}</p>
                <p><span className="font-bold text-slate-700">Estado:</span> <span className={`font-bold ${esAnulada ? 'text-rose-600' : 'text-emerald-600'}`}>{esAnulada ? 'ANULADA' : 'VIGENTE'}</span></p>
                <p><span className="font-bold text-slate-700">Forma de pago:</span> <span className="font-bold text-[#013299]">{formaPagoTexto}</span></p>
                <p><span className="font-bold text-slate-700">Envases Prestados:</span> {guiaLocal.botellones_prestados_entrega || 0} unidades</p>
                {guiaLocal.numero_factura && (
                  <p><span className="font-bold text-slate-700">Se facturará en:</span> Factura/Boleta N° {guiaLocal.numero_factura}</p>
                )}
                {reemplazaA && (
                  <p><span className="font-bold text-slate-700">Vínculo:</span> <span className="font-bold text-amber-700">Reemplaza a N° #{formatearFolio(reemplazaA)}</span></p>
                )}
              </div>
            </div>

            {/* Tabla de Productos / Ítems */}
            <div className="py-5">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3">Descripción / Producto</th>
                      <th className="py-2.5 px-3 text-center">Tipo</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">P. Unitario</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guiaLocal.items && guiaLocal.items.length > 0 ? (
                      guiaLocal.items.map((it: any, idx: number) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {it.producto?.nombre || 'Producto'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {it.tipo_transaccion || 'VENTA'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">
                            {it.cantidad}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            ${Number(it.precio_unitario || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            ${Number(it.subtotal || it.cantidad * it.precio_unitario).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No hay ítems registrados en este comprobante.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right uppercase text-slate-600 text-xs">
                        Total de Entrega:
                      </td>
                      <td className={`py-3 px-3 text-right text-base font-black ${esAnulada ? 'text-rose-600' : 'text-[#013299]'}`}>
                        {esAnulada ? (
                          <span>
                            <span className="line-through">${Number(guiaLocal.total || 0).toLocaleString('es-CL')}</span>
                            <span className="text-xs ml-1 font-semibold">(Sin efecto)</span>
                          </span>
                        ) : (
                          `$${Number(guiaLocal.total || 0).toLocaleString('es-CL')}`
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Observaciones */}
            {guiaLocal.observaciones && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mb-5">
                <span className="font-bold block uppercase text-[10px] text-amber-800 mb-0.5">Observaciones:</span>
                <p>{guiaLocal.observaciones}</p>
              </div>
            )}

            {/* Sección de Firma y Recepción */}
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                
                {/* Cuadro de Recepción Conforme */}
                <div className="sm:col-span-6 space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recepción Conforme</p>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <p>
                      <span className="font-bold text-slate-700">Nombre Receptor: </span> 
                      <span className="font-bold text-slate-900">{guiaLocal.nombre_receptor || 'No especificado'}</span>
                    </p>
                    {guiaLocal.rut_receptor && (
                      <p>
                        <span className="font-bold text-slate-700">RUT Receptor: </span> 
                        <span className="font-mono text-slate-800">{guiaLocal.rut_receptor}</span>
                      </p>
                    )}
                    <p>
                      <span className="font-bold text-slate-700">Fecha/Hora Recepción: </span> 
                      <span className="text-slate-700">{fechaRecepcionTexto}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 pt-1">
                      El receptor declara recibir las mercaderías a su entera conformidad.
                    </p>
                  </div>
                </div>

                {/* Recuadro de Firma Digital */}
                <div className="sm:col-span-6">
                  <div className="border border-slate-200 rounded-xl p-3 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-[#013299]" />
                        Firma Digital del Receptor
                      </span>
                      {tieneFirma && !editandoFirma && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full print:border-none ${esAnulada ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          Firmada
                        </span>
                      )}
                    </div>

                    {tieneFirma && !editandoFirma ? (
                      <div className="space-y-2">
                        <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-center border border-slate-100 min-h-[120px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={guiaLocal.firma_digital} 
                            alt="Firma del Receptor" 
                            className="max-h-[110px] max-w-full object-contain mix-blend-multiply"
                          />
                        </div>
                        <div className="text-center pt-1 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">
                            Firma Receptor Conforme
                          </p>
                          <p className={`text-[9px] font-bold ${esAnulada ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {esAnulada ? 'Firma de la entrega original. Documento anulado.' : (guiaLocal.nombre_receptor || 'Receptor')}
                          </p>
                        </div>
                      </div>
                    ) : editandoFirma && !esAnulada ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 italic">
                          Dibuja la firma del receptor con el cursor o pantalla táctil:
                        </p>
                        <FirmaCanvas 
                          value={nuevaFirma} 
                          onChange={(dataUrl) => setNuevaFirma(dataUrl)} 
                          height={120} 
                        />
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoFirma(false);
                              setNuevaFirma(null);
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleGuardarFirma}
                            disabled={guardandoFirma || !nuevaFirma}
                            className="px-3.5 py-1.5 text-xs bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {guardandoFirma ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Guardar Firma
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <PenTool className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-slate-400 italic">
                          Comprobante sin firma digital registrada
                        </p>
                        {!esAnulada && (
                          <button
                            type="button"
                            onClick={() => setEditandoFirma(true)}
                            className="text-xs text-[#013299] font-bold hover:underline"
                          >
                            + Registrar firma ahora
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Pie de página oficial no tributario */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:mt-4">
              <p>Documento interno de control de entrega. No constituye documento tributario. • Sistema Integral de Gestión Operativa (SIGO SODATAL)</p>
            </div>

          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          div[role='dialog'],
          .fixed.inset-0 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .fixed.inset-0 * {
            visibility: visible;
          }
          @page {
            size: portrait;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
