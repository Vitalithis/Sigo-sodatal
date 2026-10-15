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
  Filter,
  FileCode
} from 'lucide-react';
import { 
  buscarClientesGuiaAction, 
  obtenerGuiasPorClienteYRangoAction 
} from '../actions';
import { 
  descargarGuiasCsv, 
  descargarDossierPDF, 
  descargarGuiasSql,
  obtenerEstadoDocumento, 
  formatearFolio 
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
  const { popup, showError, close } = usePopup();

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
  const [formaPago, setFormaPago] = useState('TODAS');
  const [soloFirmadas, setSoloFirmadas] = useState(true);
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);

  // Resultados
  const [consultando, setConsultando] = useState(false);
  const [guiasEncontradas, setGuiasEncontradas] = useState<any[] | null>(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (clienteInicial) {
        setClienteSeleccionado(clienteInicial);
        setCriterioCliente(clienteInicial.nombre);
      } else {
        setClienteSeleccionado(null);
        setCriterioCliente('');
      }
      setGuiasEncontradas(null);
      setSoloFirmadas(true);
      setIncluirAnuladas(false);
      setFormaPago('TODAS');
      const fin = new Date();
      const inicio = new Date();
      inicio.setMonth(fin.getMonth() - 2);
      setFechaDesde(formatoFechaInput(inicio));
      setFechaHasta(formatoFechaInput(fin));
    }
  }, [isOpen, clienteInicial]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropClienteRef.current && !dropClienteRef.current.contains(e.target as Node)) {
        setMostrarDropClientes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCerrar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
      forma_pago: formaPago,
    });
    setConsultando(false);

    if (res.success) {
      setGuiasEncontradas(res.guias || []);
      if ((res.guias || []).length === 0) {
        showError('Sin resultados', 'No se encontraron comprobantes en el rango de fechas seleccionado.');
      }
    } else {
      showError('Error de consulta', res.message || 'No se pudieron consultar los comprobantes.');
    }
  };

  // Cálculo de totales: Anuladas nunca suman al monto
  const guiasValidas = guiasEncontradas || [];
  const totalMonto = guiasValidas.reduce(
    (acc, g) => acc + (obtenerEstadoDocumento(g) === 'ANULADA' ? 0 : Number(g.total || 0)), 
    0
  );
  const totalVigentes = guiasValidas.filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA').length;
  const totalFirmadas = guiasValidas.filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA' && !!g.firma_digital).length;

  const handleDescargarDossier = async () => {
    if (!guiasEncontradas || guiasEncontradas.length === 0) {
      showError('Sin comprobantes', 'Primero consulta y verifica que existan registros para exportar.');
      return;
    }
    setDescargando(true);
    try {
      await descargarDossierPDF(clienteSeleccionado, guiasEncontradas, {
        desde: fechaDesde,
        hasta: fechaHasta,
      }, incluirAnuladas);
    } catch (err: any) {
      showError('Error de Descarga', 'No se pudo generar el documento PDF.');
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarExcel = () => {
    if (!guiasEncontradas || guiasEncontradas.length === 0) {
      showError('Sin comprobantes', 'Primero consulta y verifica que existan registros para exportar.');
      return;
    }
    const nombreLimpio = (clienteSeleccionado?.nombre || 'Todas_Empresas').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nombreArchivo = `Comprobantes_${nombreLimpio}_${fechaDesde}_${fechaHasta}.csv`;
    descargarGuiasCsv(guiasEncontradas, nombreArchivo);
  };

  const handleDescargarSQL = () => {
    if (!guiasEncontradas || guiasEncontradas.length === 0) {
      showError('Sin comprobantes', 'Primero consulta y verifica que existan registros para exportar.');
      return;
    }
    const nombreLimpio = (clienteSeleccionado?.nombre || 'Todas_Empresas').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nombreArchivo = `Facturacion_${nombreLimpio}_${fechaDesde}_${fechaHasta}.sql`;
    descargarGuiasSql(guiasEncontradas, nombreArchivo);
  };

  const handleCerrar = () => {
    setClienteSeleccionado(null);
    setCriterioCliente('');
    setGuiasEncontradas(null);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <PopupGlobal popup={popup} onClose={close} />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-[#013299] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Descargar Comprobantes de Entrega
              </h3>
              <p className="text-xs text-blue-100">
                Respaldo consolidado por cliente y rango de fecha para facturación y cobro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* 1. Selector de Cliente */}
          <div ref={dropClienteRef} className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#013299]" />
                Cliente (Empresa o Particular)
              </span>
              {clienteSeleccionado && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setCriterioCliente('');
                    setGuiasEncontradas(null);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Deseleccionar
                </button>
              )}
            </label>

            {clienteSeleccionado ? (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-blue-100/80 text-[#013299] rounded-lg shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#013299] truncate block text-sm">
                        {clienteSeleccionado.nombre}
                      </span>
                      {clienteSeleccionado.rut_empresa && (
                        <span className="text-[10px] bg-blue-100 text-[#013299] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                          {clienteSeleccionado.rut_empresa}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px] block mt-0.5 truncate">
                      Modalidad: {clienteSeleccionado.modalidad_pago || 'MENSUAL'} {clienteSeleccionado.direccion ? `• ${clienteSeleccionado.direccion}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setCriterioCliente('');
                    setGuiasEncontradas(null);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ml-2 shadow-2xs"
                  title="Deseleccionar cliente y consultar todos"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={criterioCliente}
                  onChange={(e) => {
                    setCriterioCliente(e.target.value);
                    setClienteSeleccionado(null);
                    setGuiasEncontradas(null);
                  }}
                  placeholder="Escribe nombre o RUT (o deja en blanco para todos)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20"
                />
                {criterioCliente && !buscandoClientes && (
                  <button
                    type="button"
                    onClick={() => {
                      setCriterioCliente('');
                      setClientesSugeridos([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {buscandoClientes && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Dropdown sugerencias */}
            {mostrarDropClientes && clientesSugeridos.length > 0 && !clienteSeleccionado && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
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
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors flex flex-col text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
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

          {/* 3. Forma de Pago y Filtros */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#013299]" />
                Forma de Pago
              </label>
              <select
                value={formaPago}
                onChange={(e) => {
                  setFormaPago(e.target.value);
                  setGuiasEncontradas(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#013299]"
              >
                <option value="TODAS">Todas las formas de pago</option>
                <option value="CREDITO">Solo Crédito / Mensual (Para Facturación)</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta (Transbank / POS)</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
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
                <span>Solo comprobantes con <b className="text-emerald-700">firma digital</b></span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={incluirAnuladas}
                  onChange={(e) => {
                    setIncluirAnuladas(e.target.checked);
                    setGuiasEncontradas(null);
                  }}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300"
                />
                <span className="text-[11px] text-rose-700">Incluir anuladas (marcadas)</span>
              </label>
            </div>
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
                  Consultando comprobantes en el período...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar Comprobantes en este Período
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Comprobantes Vigentes</span>
                      <span className="text-lg font-black text-[#013299]">{totalVigentes}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Firmadas</span>
                      <span className="text-lg font-black text-emerald-700">{totalFirmadas}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total a Facturar</span>
                      <span className="text-lg font-black text-slate-900">${totalMonto.toLocaleString('es-CL')}</span>
                    </div>
                  </div>



                  {/* Botones de Descarga */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleDescargarDossier}
                      disabled={descargando}
                      className="px-3 py-3 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      title="Descarga dossier con carátula y todos los comprobantes individuales firmados"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>Dossier PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDescargarExcel}
                      className="px-3 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      title="Descarga archivo CSV protegido con todos los registros"
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span>Planilla CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDescargarSQL}
                      className="px-3 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      title="Descarga script SQL para importar en software contable"
                    >
                      <FileCode className="w-4 h-4 shrink-0" />
                      <span>Script SQL</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <p className="font-semibold text-xs text-slate-600">No hay comprobantes para los filtros seleccionados</p>
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
