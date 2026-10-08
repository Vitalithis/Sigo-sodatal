'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Calendar, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Building, 
  DollarSign, 
  Printer, 
  Loader2,
  Clock,
  Filter
} from 'lucide-react';
import { 
  buscarClientesGuiaAction, 
  obtenerGuiasPorClienteYRangoAction 
} from '../actions';
import { 
  generarHtmlDossierGuias, 
  descargarGuiasCsv, 
  descargarBlob, 
  abrirHtmlParaImprimir,
  descargarDossierPDF
} from '../utils/exportarDocumentosGuias';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface DescargarGuiasModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteInicial?: any;
}

export default function DescargarGuiasModal({
  isOpen,
  onClose,
  clienteInicial,
}: DescargarGuiasModalProps) {
  const { popup, showSuccess, showError, close } = usePopup();

  // Cliente
  const [criterioCliente, setCriterioCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<any[]>([]);
  const [mostrarDropClientes, setMostrarDropClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(clienteInicial || null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const dropClienteRef = useRef<HTMLDivElement>(null);

  // Fechas (por defecto los últimos 2 meses)
  const hoy = new Date();
  const haceDosMeses = new Date();
  haceDosMeses.setMonth(hoy.getMonth() - 2);

  const formatoFechaInput = (d: Date) => d.toISOString().split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(formatoFechaInput(haceDosMeses));
  const [fechaHasta, setFechaHasta] = useState(formatoFechaInput(hoy));

  // Filtros
  const [soloFirmadas, setSoloFirmadas] = useState(true);
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);

  // Resultados
  const [consultando, setConsultando] = useState(false);
  const [guiasEncontradas, setGuiasEncontradas] = useState<any[] | null>(null);
  const [descargando, setDescargando] = useState(false);

  // Sincronizar cliente inicial si viene provisto
  useEffect(() => {
    if (clienteInicial) {
      setClienteSeleccionado(clienteInicial);
      setCriterioCliente(clienteInicial.nombre);
    }
  }, [clienteInicial]);

  // Click outside para cerrar dropdown de clientes
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropClienteRef.current && !dropClienteRef.current.contains(e.target as Node)) {
        setMostrarDropClientes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda de clientes
  useEffect(() => {
    if (!criterioCliente || criterioCliente.trim().length < 2) {
      setClientesSugeridos([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setBuscandoClientes(true);
      const res = await buscarClientesGuiaAction(criterioCliente);
      setBuscandoClientes(false);
      if (res.success && res.clientes) {
        setClientesSugeridos(res.clientes);
        setMostrarDropClientes(true);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [criterioCliente]);

  if (!isOpen) return null;

  // Presets de fechas
  const setPresetRango = (mesesAtras: number) => {
    const fin = new Date();
    const inicio = new Date();
    inicio.setMonth(fin.getMonth() - mesesAtras);
    setFechaDesde(formatoFechaInput(inicio));
    setFechaHasta(formatoFechaInput(fin));
  };

  const setPresetMesActual = () => {
    const fin = new Date();
    const inicio = new Date(fin.getFullYear(), fin.getMonth(), 1);
    setFechaDesde(formatoFechaInput(inicio));
    setFechaHasta(formatoFechaInput(fin));
  };

  const setPresetMesAnterior = () => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    setFechaDesde(formatoFechaInput(inicio));
    setFechaHasta(formatoFechaInput(fin));
  };

  const consultarGuias = async () => {
    setConsultando(true);
    const res = await obtenerGuiasPorClienteYRangoAction({
      cliente_id: clienteSeleccionado?.id || 'TODOS',
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      solo_firmadas: soloFirmadas,
      incluir_anuladas: incluirAnuladas,
    });
    setConsultando(false);

    if (res.success) {
      setGuiasEncontradas(res.guias || []);
      if ((res.guias || []).length === 0) {
        showError('Sin resultados', 'No se encontraron guías en el rango de fechas seleccionado.');
      }
    } else {
      showError('Error de consulta', res.message || 'No se pudieron consultar las guías.');
    }
  };

  const totalMonto = (guiasEncontradas || []).reduce(
    (acc, g) => acc + (g.estado === 'ANULADA' ? 0 : (g.total || 0)), 
    0
  );
  const totalFirmadas = (guiasEncontradas || []).filter((g) => !!g.firma_digital).length;

  const handleDescargarDossier = async () => {
    if (!guiasEncontradas || guiasEncontradas.length === 0) {
      showError('Sin guías', 'Primero consulta y verifica que existan guías para exportar.');
      return;
    }
    setDescargando(true);
    try {
      await descargarDossierPDF(clienteSeleccionado, guiasEncontradas, {
        desde: fechaDesde,
        hasta: fechaHasta,
      });
    } catch (err: any) {
      showError('Error de Descarga', 'No se pudo generar el documento PDF.');
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarExcel = () => {
    if (!guiasEncontradas || guiasEncontradas.length === 0) {
      showError('Sin guías', 'Primero consulta y verifica que existan guías para exportar.');
      return;
    }
    const nombreLimpio = (clienteSeleccionado?.nombre || 'Todas_Empresas').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nombreArchivo = `Guias_${nombreLimpio}_${fechaDesde}_${fechaHasta}.csv`;
    descargarGuiasCsv(guiasEncontradas, nombreArchivo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <PopupGlobal popup={popup} onClose={close} />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-[#013299] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Descargar Guías de Despacho
              </h3>
              <p className="text-xs text-blue-100">
                Respaldo consolidado por cliente y rango de fecha para pagos
              </p>
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

        {/* Formulario y Contenido */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* 1. Selector de Cliente */}
          <div className="relative" ref={dropClienteRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#013299]" />
                Cliente / Empresa
              </span>
              {clienteSeleccionado && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setCriterioCliente('');
                    setGuiasEncontradas(null);
                  }}
                  className="text-[11px] text-[#013299] hover:underline lowercase font-semibold"
                >
                  (cambiar a todos los clientes)
                </button>
              )}
            </label>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={clienteSeleccionado ? clienteSeleccionado.nombre : 'Buscar cliente (o dejar en blanco para todos)...'}
                value={criterioCliente}
                onChange={(e) => {
                  setCriterioCliente(e.target.value);
                  if (clienteSeleccionado) setClienteSeleccionado(null);
                }}
                onFocus={() => {
                  if (clientesSugeridos.length > 0) setMostrarDropClientes(true);
                }}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all ${
                  clienteSeleccionado ? 'border-blue-300 bg-blue-50/40 font-semibold' : 'border-slate-200'
                }`}
              />
              {buscandoClientes && (
                <Loader2 className="w-4 h-4 text-[#013299] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Dropdown sugerencias */}
            {mostrarDropClientes && clientesSugeridos.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setCriterioCliente('');
                    setMostrarDropClientes(false);
                    setGuiasEncontradas(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 text-xs font-bold text-[#013299] flex items-center justify-between"
                >
                  <span>🌐 Todos los clientes (reporte general)</span>
                </button>
                {clientesSugeridos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setCriterioCliente(c.nombre);
                      setMostrarDropClientes(false);
                      setGuiasEncontradas(null);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50/80 transition-colors text-xs flex flex-col gap-0.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 group-hover:text-[#013299] transition-colors">
                        {c.nombre}
                      </span>
                      {c.rut_empresa && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono shrink-0">
                          {c.rut_empresa}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate">
                      {c.direccion || 'Sin dirección registrada'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {clienteSeleccionado && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#013299] block">{clienteSeleccionado.nombre}</span>
                  <span className="text-slate-600 text-[11px]">
                    RUT: {clienteSeleccionado.rut_empresa || 'S/RUT'} • Modalidad: {clienteSeleccionado.modalidad_pago || 'MENSUAL'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#013299]">
                  Seleccionado
                </span>
              </div>
            )}
          </div>

          {/* 2. Rango de Fechas y Presets */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#013299]" />
                Rango de Fechas
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPresetRango(2)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-600 transition-colors"
                  title="Últimos 2 meses"
                >
                  2 Meses
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRango(3)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-600 transition-colors"
                  title="Últimos 3 meses"
                >
                  3 Meses
                </button>
                <button
                  type="button"
                  onClick={setPresetMesActual}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-600 transition-colors"
                  title="Mes en curso"
                >
                  Mes Actual
                </button>
                <button
                  type="button"
                  onClick={setPresetMesAnterior}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-[#013299] hover:text-white text-slate-600 transition-colors"
                  title="Mes cerrado anterior"
                >
                  Mes Anterior
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Fecha Desde</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value);
                    setGuiasEncontradas(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Fecha Hasta</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value);
                    setGuiasEncontradas(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299]"
                />
              </div>
            </div>
          </div>

          {/* 3. Filtros adicionales */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={soloFirmadas}
                onChange={(e) => {
                  setSoloFirmadas(e.target.checked);
                  setGuiasEncontradas(null);
                }}
                className="w-4 h-4 text-[#013299] rounded border-slate-300 focus:ring-[#013299]"
              />
              <span>Solo guías con <b className="text-emerald-700">firma digital</b> (respaldo para pago)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-500 font-medium">
              <input
                type="checkbox"
                checked={incluirAnuladas}
                onChange={(e) => {
                  setIncluirAnuladas(e.target.checked);
                  setGuiasEncontradas(null);
                }}
                className="w-4 h-4 text-slate-500 rounded border-slate-300"
              />
              <span className="text-[11px]">Incluir anuladas</span>
            </label>
          </div>

          {/* 4. Botón de Búsqueda y Resultados */}
          <div>
            <button
              type="button"
              onClick={consultarGuias}
              disabled={consultando}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {consultando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando guías en el período...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar Guías en este Período
                </>
              )}
            </button>
          </div>

          {/* 5. Vista de Resultados Encontrados */}
          {guiasEncontradas !== null && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              {guiasEncontradas.length > 0 ? (
                <>
                  {/* Resumen numérico */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Guías</span>
                      <span className="text-lg font-black text-[#013299]">{guiasEncontradas.length}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Firmadas</span>
                      <span className="text-lg font-black text-emerald-700">{totalFirmadas}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Monto</span>
                      <span className="text-lg font-black text-slate-900">${totalMonto.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {/* Tabla miniatura */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-1.5 px-3">N° Guía</th>
                          <th className="py-1.5 px-3">Fecha</th>
                          <th className="py-1.5 px-3">Cliente</th>
                          <th className="py-1.5 px-3 text-center">Firma</th>
                          <th className="py-1.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {guiasEncontradas.map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-bold text-[#013299]">#{g.numero_correlativo}</td>
                            <td className="py-1.5 px-3 text-slate-600">
                              {new Date(g.fecha_emision).toLocaleDateString('es-CL')}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-800 truncate max-w-[140px]">
                              {g.cliente?.nombre || 'S/N'}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {g.firma_digital ? (
                                <span className="text-emerald-700 font-bold text-[10px]">✓ Sí</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right font-extrabold text-slate-900">
                              ${Number(g.total || 0).toLocaleString('es-CL')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Botones de Descarga */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDescargarDossier}
                      disabled={descargando}
                      className="px-4 py-3 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      title="Descarga documento con carátula y todas las guías oficiales firmadas, listo para PDF/Impresión"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Descargar Dossier Completo (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDescargarExcel}
                      className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      title="Descarga planilla de cálculo Excel CSV con todos los registros"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Descargar Planilla Excel (CSV)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <p className="font-semibold text-xs text-slate-600">No hay guías para los filtros seleccionados</p>
                  <p className="text-[11px] text-slate-400">Prueba ampliando el rango de fechas o quitando el filtro de solo firmadas</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
