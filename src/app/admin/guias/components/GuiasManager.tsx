'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NuevaGuiaModal from './NuevaGuiaModal';
import AnularGuiaModal from './AnularGuiaModal';
import VerGuiaModal from './VerGuiaModal';
import DescargarGuiasModal from './DescargarGuiasModal';
import { exportarGuiaSQLAction } from '../actions'; 
import { 
  generarHtmlGuiaIndividual, 
  descargarBlob, 
  descargarGuiaPDF, 
  obtenerEstadoDocumento, 
  obtenerFormaPagoLabel, 
  formatearFolio 
} from '../utils/exportarDocumentosGuias';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  FileCode,
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
  X,
  Eye,
  PenTool,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

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
  const [filtroFormaPago, setFiltroFormaPago] = useState('TODAS');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [modalNueva, setModalNueva] = useState(false);
  const [guiaParaReemplazo, setGuiaParaReemplazo] = useState<any | null>(null);
  const [modalDescargar, setModalDescargar] = useState(false);
  const [guiaAnular, setGuiaAnular] = useState<any>(null);
  const [guiaVer, setGuiaVer] = useState<any | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const refrescar = () => {
    setModalNueva(false);
    setGuiaParaReemplazo(null);
    setModalDescargar(false);
    setGuiaAnular(null);
    setGuiaVer(null);
    router.refresh();
  };

  const handleAnularSuccess = (guiaAnulada?: any, accion?: 'CERRAR' | 'CREAR_REEMPLAZO') => {
    setGuiaAnular(null);
    if (accion === 'CREAR_REEMPLAZO' && guiaAnulada) {
      setGuiaParaReemplazo(guiaAnulada);
      setModalNueva(true);
    } else {
      router.refresh();
    }
  };

  const handleCrearReemplazoDirecto = (g: any) => {
    setGuiaParaReemplazo(g);
    setModalNueva(true);
  };

  const [descargandoGuiaId, setDescargandoGuiaId] = useState<string | null>(null);

  const handleFirmaActualizada = () => {
    router.refresh();
  };

  const descargarGuiaDoc = async (g: any) => {
    setDescargandoGuiaId(g.id);
    try {
      await descargarGuiaPDF(g);
    } catch (err: any) {
      showError('Error al descargar', 'No se pudo generar el documento PDF.');
    } finally {
      setDescargandoGuiaId(null);
    }
  };

  const guiasFiltradas = useMemo(() => {
    const qClienteNorm = filtroCliente
      ? filtroCliente.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      : '';

    return initialGuias.filter((g) => {
      const estadoDoc = obtenerEstadoDocumento(g);
      if (filtroEstado !== 'TODOS' && estadoDoc !== filtroEstado) return false;

      if (filtroFormaPago !== 'TODAS') {
        const fp = obtenerFormaPagoLabel(g).toUpperCase();
        if (filtroFormaPago === 'EFECTIVO' && !fp.includes('EFECTIVO')) return false;
        if (filtroFormaPago === 'TARJETA' && !fp.includes('TARJETA')) return false;
        if (filtroFormaPago === 'TRANSFERENCIA' && !fp.includes('TRANSFERENCIA')) return false;
        if (filtroFormaPago === 'CREDITO' && !fp.includes('CRÉDITO') && !fp.includes('CREDITO')) return false;
      }

      if (qClienteNorm) {
        const nomNorm = (g.cliente?.nombre || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const rutNorm = (g.cliente?.rut_empresa || '').toLowerCase();
        if (!nomNorm.includes(qClienteNorm) && !rutNorm.includes(qClienteNorm)) {
          return false;
        }
      }

      if (filtroDesde || filtroHasta) {
        const fechaG = new Date(g.fecha_emision).toISOString().split('T')[0];
        if (filtroDesde && fechaG < filtroDesde) return false;
        if (filtroHasta && fechaG > filtroHasta) return false;
      }

      return true;
    });
  }, [initialGuias, filtroEstado, filtroFormaPago, filtroCliente, filtroDesde, filtroHasta]);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(15);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, filtroFormaPago, filtroCliente, filtroDesde, filtroHasta]);

  const totalPaginas = Math.max(1, Math.ceil(guiasFiltradas.length / elementosPorPagina));

  const guiasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return guiasFiltradas.slice(inicio, inicio + elementosPorPagina);
  }, [guiasFiltradas, paginaActual, elementosPorPagina]);

  const indiceInicio = guiasFiltradas.length === 0 ? 0 : (paginaActual - 1) * elementosPorPagina + 1;
  const indiceFin = Math.min(paginaActual * elementosPorPagina, guiasFiltradas.length);

  // Métricas rápidas
  const totalFiltrado = useMemo(() => {
    return guiasFiltradas
      .filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA')
      .reduce((acc, g) => acc + (g.total || 0), 0);
  }, [guiasFiltradas]);

  const guiasVigentesCount = useMemo(() => {
    return guiasFiltradas.filter((g) => obtenerEstadoDocumento(g) === 'VIGENTE').length;
  }, [guiasFiltradas]);

  const guiasCreditoCount = useMemo(() => {
    return guiasFiltradas.filter(
      (g) => obtenerEstadoDocumento(g) !== 'ANULADA' && (g.forma_pago === 'CREDITO' || g.estado === 'ENTREGADA_CREDITO')
    ).length;
  }, [guiasFiltradas]);

  const guiasAnuladasCount = useMemo(() => {
    return guiasFiltradas.filter((g) => obtenerEstadoDocumento(g) === 'ANULADA').length;
  }, [guiasFiltradas]);

  const exportarGuia = async (id: string) => {
    setExportando(id);
    const res = await exportarGuiaSQLAction(id);
    setExportando(null);
    if (res.success && res.sql && res.filename) {
      descargarSQL(res.sql, res.filename);
      showSuccess('Exportación Exitosa', `Comprobante exportado como ${res.filename}`);
    } else {
      showError('Error de Exportación', res.message || 'Error al exportar el comprobante.');
    }
  };

  const limpiarFiltros = () => {
    setFiltroEstado('TODOS');
    setFiltroFormaPago('TODAS');
    setFiltroCliente('');
    setFiltroDesde('');
    setFiltroHasta('');
  };

  const hayFiltrosActivos =
    filtroEstado !== 'TODOS' ||
    filtroFormaPago !== 'TODAS' ||
    filtroCliente !== '' ||
    filtroDesde !== '' ||
    filtroHasta !== '';

  return (
    <div className="space-y-6">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comprobantes Vigentes</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasVigentesCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Total Vigente</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${totalFiltrado.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crédito Empresa</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasCreditoCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anuladas (Histórico)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{guiasAnuladasCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Main Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        {/* Fila 1: Búsqueda rápida y Botones principales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Búsqueda cliente */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
            />
            {filtroCliente && (
              <button
                type="button"
                onClick={() => setFiltroCliente('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setModalDescargar(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Descargar comprobantes consolidados (PDF, CSV, SQL)"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Descargar Comprobantes</span>
            </button>

            <button
              onClick={() => {
                setGuiaParaReemplazo(null);
                setModalNueva(true);
              }}
              className="px-3.5 py-2 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#013299]/20 hover:shadow-none flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Comprobante</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Filtros secundarios alineados */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          {/* Filter by Document Status */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#013299] transition-all"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="VIGENTE">VIGENTE</option>
            <option value="ANULADA">ANULADA</option>
          </select>

          {/* Filter by Payment Method */}
          <select
            value={filtroFormaPago}
            onChange={(e) => setFiltroFormaPago(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#013299] transition-all"
          >
            <option value="TODAS">Todas las formas de pago</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="CREDITO">Crédito Empresa</option>
          </select>

          {/* Date Range filters */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none w-[115px]"
              title="Fecha desde"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none w-[115px]"
              title="Fecha hasta"
            />
          </div>

          {/* Clear other filters if active */}
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 shrink-0 ml-auto sm:ml-0"
              title="Restablecer filtros"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">N° Folio</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Repartidor</th>
                <th className="py-3.5 px-4 text-center">Forma Pago</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-[230px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {guiasPaginadas.length > 0 ? (
                guiasPaginadas.map((g) => {
                  const esAnulada = obtenerEstadoDocumento(g) === 'ANULADA';
                  const formaPagoStr = obtenerFormaPagoLabel(g);
                  const reemplazaA = g.reemplaza_a?.numero_correlativo || g.reemplaza_a_correlativo;
                  const reemplazadaPor = g.reemplazada_por?.numero_correlativo || g.reemplazada_por_correlativo;

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Folio y Badges de Vínculo */}
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-[#013299] font-mono font-bold text-sm">
                              #{formatearFolio(g.numero_correlativo)}
                            </span>
                            {g.firma_digital ? (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0" 
                                title="Entrega firmada digitalmente por el receptor"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Firmada
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0" 
                                title="Sin firma digital registrada"
                              >
                                Sin firma
                              </span>
                            )}
                          </div>

                          {/* Indicadores de Reemplazo */}
                          {reemplazadaPor && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 w-fit"
                              title={`Reemplazada por N° ${formatearFolio(reemplazadaPor)}`}
                            >
                              <ArrowRight className="w-3 h-3 text-blue-600" />
                              <span>#{formatearFolio(reemplazadaPor)}</span>
                            </span>
                          )}

                          {reemplazaA && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit"
                              title={`Reemplaza a N° ${formatearFolio(reemplazaA)}`}
                            >
                              <ArrowLeft className="w-3 h-3 text-amber-600" />
                              <span>Reemplaza #{formatearFolio(reemplazaA)}</span>
                            </span>
                          )}
                        </div>
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

                      {/* Forma de Pago */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {formaPagoStr}
                        </span>
                      </td>

                      {/* Estado Documental */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${esAnulada ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {esAnulada ? 'ANULADA' : 'VIGENTE'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm">
                        {esAnulada ? (
                          <span className="line-through text-slate-400 font-semibold" title="Documento anulado sin efecto">
                            ${Number(g.total || 0).toLocaleString('es-CL')}
                          </span>
                        ) : (
                          <span className="text-slate-900">
                            ${Number(g.total || 0).toLocaleString('es-CL')}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="w-[208px] mx-auto flex items-center justify-between">
                          <button
                            onClick={() => setGuiaVer(g)}
                            className="h-7 w-[54px] bg-[#013299] hover:bg-blue-900 text-white rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm shadow-[#013299]/20 shrink-0"
                            title="Ver Comprobante de Entrega oficial"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>

                          <button
                            onClick={() => descargarGuiaDoc(g)}
                            disabled={descargandoGuiaId === g.id}
                            className="h-7 w-[54px] bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 shrink-0"
                            title="Descargar comprobante en formato PDF (.pdf)"
                          >
                            {descargandoGuiaId === g.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>PDF</span>
                          </button>

                          <button
                            onClick={() => exportarGuia(g.id)}
                            disabled={exportando === g.id}
                            className="h-7 w-[54px] bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#013299] rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 shrink-0"
                            title="Exportar SQL"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>SQL</span>
                          </button>

                          {!esAnulada ? (
                            <button
                              onClick={() => setGuiaAnular(g)}
                              className="w-7 h-7 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center shrink-0"
                              title="Anular Comprobante"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : !reemplazadaPor && !g.reemplazada_por_guia_id ? (
                            <button
                              onClick={() => handleCrearReemplazoDirecto(g)}
                              className="w-7 h-7 bg-blue-50 border border-blue-200 text-[#013299] hover:bg-blue-100 rounded-lg font-bold transition-colors flex items-center justify-center shrink-0"
                              title="Crear comprobante de reemplazo"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#013299]" />
                            </button>
                          ) : (
                            <div 
                              className="w-7 h-7 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300 shrink-0"
                              title={reemplazadaPor ? `Reemplazada por N° #${formatearFolio(reemplazadaPor)}` : 'Comprobante reemplazado'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">No se encontraron comprobantes de entrega</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros de búsqueda</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación */}
        {guiasFiltradas.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Contador y selector de items por página */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-600 font-medium">
                Mostrando <b className="text-slate-900 font-bold">{indiceInicio}</b> a <b className="text-slate-900 font-bold">{indiceFin}</b> de <b className="text-[#013299] font-bold">{guiasFiltradas.length}</b> comprobantes
              </span>

              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="text-[11px] text-slate-400">Por página:</span>
                <select
                  value={elementosPorPagina}
                  onChange={(e) => {
                    setElementosPorPagina(Number(e.target.value));
                    setPaginaActual(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#013299]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Controles de página */}
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg font-bold transition-colors flex items-center gap-1 shadow-2xs text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter((p) => {
                      return p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1;
                    })
                    .map((num, idx, arr) => {
                      const prevNum = arr[idx - 1];
                      const mostrarPuntos = prevNum && num - prevNum > 1;

                      return (
                        <React.Fragment key={num}>
                          {mostrarPuntos && (
                            <span className="px-1 text-slate-400 font-bold">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPaginaActual(num)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors flex items-center justify-center ${
                              paginaActual === num
                                ? 'bg-[#013299] text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {num}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 border border-slate-200 rounded-lg font-bold transition-colors flex items-center gap-1 shadow-2xs text-xs"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <VerGuiaModal
        guia={guiaVer}
        isOpen={!!guiaVer}
        onClose={() => setGuiaVer(null)}
        onFirmaActualizada={handleFirmaActualizada}
      />
      <DescargarGuiasModal
        isOpen={modalDescargar}
        onClose={() => setModalDescargar(false)}
      />
      <NuevaGuiaModal 
        isOpen={modalNueva} 
        initialData={guiaParaReemplazo ? { guia_reemplazo_origen: guiaParaReemplazo } : undefined} 
        onClose={() => {
          setModalNueva(false);
          setGuiaParaReemplazo(null);
        }} 
        onSuccess={() => {
          setGuiaParaReemplazo(null);
          refrescar();
        }} 
      />
      <AnularGuiaModal 
        guia={guiaAnular} 
        isOpen={!!guiaAnular} 
        onClose={() => setGuiaAnular(null)} 
        onSuccess={handleAnularSuccess} 
      />
    </div>
  );
}
