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
  Share2
} from 'lucide-react';
import FirmaCanvas from './FirmaCanvas';
import { guardarFirmaGuiaAction, exportarGuiaSQLAction } from '../actions';
import { generarHtmlGuiaIndividual, descargarBlob, descargarGuiaPDF } from '../utils/exportarDocumentosGuias';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface VerGuiaModalProps {
  guia: any | null;
  isOpen: boolean;
  onClose: () => void;
  onFirmaActualizada?: () => void;
}

const ESTADO_LABELS: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'Entregada (Efectivo)',
  ENTREGADA_TARJETA: 'Entregada (Tarjeta)',
  ENTREGADA_TRANSFERENCIA: 'Entregada (Transferencia)',
  ENTREGADA_CREDITO: 'Entregada (Crédito Empresa)',
  ANULADA: 'Anulada',
};

const ESTADO_BADGE_CLASS: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ENTREGADA_TARJETA: 'bg-blue-100 text-[#013299] border-blue-300',
  ENTREGADA_TRANSFERENCIA: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  ENTREGADA_CREDITO: 'bg-amber-100 text-amber-800 border-amber-300',
  ANULADA: 'bg-rose-100 text-rose-800 border-rose-300',
};

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

  // Sincronizar estado local al abrir o cambiar la guía
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
      showSuccess('Firma Guardada', 'La firma digital ha sido registrada en la guía de despacho.');
      setGuiaLocal((prev: any) => ({ ...prev, firma_digital: nuevaFirma }));
      setEditandoFirma(false);
      setNuevaFirma(null);
      if (onFirmaActualizada) onFirmaActualizada();
    } else {
      showError('Error al guardar firma', res.message || 'Ocurrió un error.');
    }
  };

  const tieneFirma = !!guiaLocal.firma_digital;
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Contenedor del Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:h-auto print:max-h-none print:m-0 print:p-0">
        
        {/* Barra superior de acciones (Se oculta al imprimir) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#013299] rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Guía de Despacho #{guiaLocal.numero_correlativo}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${ESTADO_BADGE_CLASS[guiaLocal.estado] || 'bg-slate-800 text-slate-200 border-slate-700'}`}>
                  {ESTADO_LABELS[guiaLocal.estado] || guiaLocal.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente: <span className="text-white font-medium">{guiaLocal.cliente?.nombre || 'S/N'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarSQL}
              disabled={exportandoSQL}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Descargar respaldo en archivo SQL"
            >
              <Download className="w-3.5 h-3.5" />
              SQL
            </button>

            <button
              onClick={handleDescargarGuia}
              disabled={generandoPDF}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              title="Descargar documento oficial en formato PDF (.pdf)"
            >
              {generandoPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{generandoPDF ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={handleImprimir}
              className="px-3.5 py-1.5 bg-[#013299] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              title="Imprimir documento o Guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            <button
              onClick={handleCerrar}
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ÁREA DEL DOCUMENTO (Formato Oficial Guía de Despacho Chilena) */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-4 text-slate-900 font-sans print:rounded-none">
            
            {/* Encabezado: Logo Emisor vs Recuadro Rojo SII */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-200">
              
              {/* Datos de SODATAL (Emisor) */}
              <div className="sm:col-span-7 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-[#013299] tracking-tight uppercase">SODATAL</span>
                  <span className="bg-blue-50 text-[#013299] border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    Agua & Soda Purificada
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700">DISTRIBUIDORA Y LOGÍSTICA SODATAL SpA</p>
                <p className="text-xs text-slate-500 leading-snug">
                  Giro: Purificación, embotellado y distribución de aguas minerales y sodas
                </p>
                <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#013299]" />
                    Casa Matriz: Los Ángeles, Región del Biobío, Chile
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-[#013299]" />
                    Contacto: contacto@sodatal.cl • +56 9 8765 4321
                  </p>
                </div>
              </div>

              {/* Recuadro Rojo Oficial de Guía de Despacho */}
              <div className="sm:col-span-5 flex justify-center sm:justify-end">
                <div className="border-2 border-red-600 rounded-lg p-3 sm:p-4 text-center w-full max-w-[260px] bg-red-50/20">
                  <p className="text-xs font-black text-red-600 tracking-wider">R.U.T.: 76.892.410-5</p>
                  <p className="text-sm font-black text-red-700 uppercase my-1 tracking-wide">
                    GUÍA DE DESPACHO
                  </p>
                  <p className="text-base font-black text-red-600 font-mono">
                    N° {String(guiaLocal.numero_correlativo).padStart(6, '0')}
                  </p>
                  <p className="text-[10px] text-red-500 font-semibold mt-1">S.I.I. - UNIDAD LOS ÁNGELES</p>
                </div>
              </div>
            </div>

            {/* Datos del Cliente y Traslado */}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detalles del Despacho</p>
                <p><span className="font-bold text-slate-700">Fecha Emisión:</span> {fechaFormateada} - {horaFormateada}</p>
                <p><span className="font-bold text-slate-700">Repartidor:</span> {guiaLocal.usuario_repartidor ? `${guiaLocal.usuario_repartidor.nombre} ${guiaLocal.usuario_repartidor.apellido || ''}` : 'Asignado en ruta'}</p>
                <p><span className="font-bold text-slate-700">Condición de Pago:</span> <span className="font-bold text-[#013299]">{ESTADO_LABELS[guiaLocal.estado] || guiaLocal.estado}</span></p>
                <p><span className="font-bold text-slate-700">Envases Prestados:</span> {guiaLocal.botellones_prestados_entrega || 0} unidades</p>
                {guiaLocal.numero_factura && (
                  <p><span className="font-bold text-slate-700">Factura Ref:</span> #{guiaLocal.numero_factura}</p>
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
                          No hay ítems registrados en esta guía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={5} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">
                        Total a Pagar:
                      </td>
                      <td className="py-3 px-3 text-right font-black text-base text-[#013299]">
                        ${Number(guiaLocal.total || 0).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Observaciones (si las hay) */}
            {guiaLocal.observaciones && (
              <div className="mb-5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold">Observaciones: </span>
                <span>{guiaLocal.observaciones}</span>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECCIÓN DE RECEPCIÓN Y FIRMA DIGITAL                          */}
            {/* ============================================================== */}
            <div className="mt-4 pt-5 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
                
                {/* Datos del Receptor */}
                <div className="sm:col-span-6 space-y-1.5 text-xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Datos de Recepción Conforme
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p>
                      <span className="font-bold text-slate-700">Receptor: </span> 
                      <span className="font-semibold text-slate-900">{guiaLocal.nombre_receptor || 'No especificado'}</span>
                    </p>
                    {guiaLocal.rut_receptor && (
                      <p>
                        <span className="font-bold text-slate-700">RUT Receptor: </span> 
                        <span className="font-mono text-slate-800">{guiaLocal.rut_receptor}</span>
                      </p>
                    )}
                    <p>
                      <span className="font-bold text-slate-700">Fecha/Hora Recepción: </span> 
                      <span className="text-slate-700">
                        {guiaLocal.hora_entrega 
                          ? new Date(guiaLocal.hora_entrega).toLocaleString('es-CL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : `${fechaFormateada} - ${horaFormateada}`}
                      </span>
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
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full print:border-none">
                          <CheckCircle2 className="w-3 h-3" />
                          Firmada
                        </span>
                      )}
                    </div>

                    {/* Caso 1: Tiene firma digital ya registrada y no está editando */}
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
                          <p className="text-[9px] text-slate-400">
                            {guiaLocal.nombre_receptor || 'Receptor'}
                          </p>
                        </div>

                        {/* Botón para cambiar o corregir firma si fuera necesario (Oculto en print) */}
                        <div className="text-right print:hidden pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoFirma(true);
                              setNuevaFirma(null);
                            }}
                            className="text-[11px] text-[#013299] hover:underline font-semibold"
                          >
                            Volver a firmar o corregir
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Caso 2: No tiene firma o el usuario hizo clic en firmar */
                      <div className="space-y-2.5">
                        {!tieneFirma && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5 print:hidden">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                              Esta guía no tiene firma registrada. Puedes solicitar que el receptor firme en el recuadro a continuación:
                            </span>
                          </div>
                        )}

                        <div className="print:hidden">
                          <FirmaCanvas
                            value={nuevaFirma}
                            onChange={(url) => setNuevaFirma(url)}
                            height={120}
                          />

                          <div className="flex gap-2 pt-2 justify-end">
                            {editandoFirma && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoFirma(false);
                                  setNuevaFirma(null);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleGuardarFirma}
                              disabled={guardandoFirma || !nuevaFirma}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              {guardandoFirma ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Guardar Firma
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Versión estática solo para impresión cuando no hay firma */}
                        <div className="hidden print:block pt-8 text-center border-t border-slate-300">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">
                            Firma y RUT Receptor Conforme
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>

            {/* Pie de página oficial */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 print:mt-4">
              <p>Documento tributario de control de despacho • Sistema Integral de Gestión Operativa (SIGO Sodatal)</p>
              <p className="text-[9px] mt-0.5">Copia electrónica válida para respaldo de pago de clientes empresa.</p>
            </div>

          </div>
        </div>

      </div>

      {/* Estilos específicos para impresión limpia de la guía en formato A4 / Carta */}
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
          /* Mostrar únicamente el contenedor del modal */
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
