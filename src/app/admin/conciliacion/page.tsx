'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import DocumentViewer from '@/components/comprobantes/DocumentViewer';
import ComprobanteForm from '@/components/comprobantes/ComprobanteForm';
import {
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  User,
  Users,
  Building2,
  Layers,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  ListFilter,
  CreditCard,
  Calendar,
  MapPin
} from 'lucide-react';

export default function ConciliacionPage() {
  const [comprobanteActual, setComprobanteActual] = useState<any>(null);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [totalPendientes, setTotalPendientes] = useState<number>(0);
  const [busqueda, setBusqueda] = useState<string>('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [exitoGlobal, setExitoGlobal] = useState<string | null>(null);
  const [clienteGrupoFiltro, setClienteGrupoFiltro] = useState<string | null>(null);
  const [tabActual, setTabActual] = useState<'TABLA_CLIENTES' | 'REVISION_PDF'>('TABLA_CLIENTES');
  const [mostrarListaMovimientos, setMostrarListaMovimientos] = useState<boolean>(false);
  const [mapaPaginas, setMapaPaginas] = useState<Record<string, { p: number; l: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de pendientes y clientes al iniciar
  const cargarPendientes = async () => {
    try {
      const res = await fetch('/api/comprobantes?estado=PENDIENTE&limit=50000');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendientes(json.data);
        setTotalPendientes(json.total ?? json.data.length);
        if (!comprobanteActual && json.data.length > 0) {
          setComprobanteActual(json.data[0]);
        }
      }
    } catch (e) {
      console.error('Error al cargar pendientes:', e);
    }
  };

  useEffect(() => {
    cargarPendientes();
    fetch('/api/clientes')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setClientes(data))
      .catch(() => {});
    fetch('/uploads/comprobantes/mapa_paginas.json')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setMapaPaginas(data))
      .catch(() => {});
  }, []);

  const handleSubirArchivo = async (file: File) => {
    setCargando(true);
    setErrorGlobal(null);
    setExitoGlobal(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/comprobantes/upload', {
        method: 'POST',
        body: formData
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        const text = await res.text();
        throw new Error(text || `Error de servidor HTTP ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(json.error || 'Error al procesar el archivo');
      }

      if (json.es_cartola) {
        setExitoGlobal(
          `¡Cartola procesada! Se detectaron ${json.importados} pagos recibidos (${json.duplicados_omitidos || 0} omitidos por ya existir).`
        );
      } else {
        setExitoGlobal('¡Comprobante analizado con éxito!');
      }

      if (json.data) {
        setComprobanteActual(json.data);
      }
      await cargarPendientes();
    } catch (err: any) {
      setErrorGlobal(err.message);
    } finally {
      setCargando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConciliar = async (datosEditados: any) => {
    if (!comprobanteActual) return;
    setErrorGlobal(null);

    try {
      const res = await fetch(`/api/comprobantes/${comprobanteActual.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'CONCILIAR', ...datosEditados })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No fue posible guardar el comprobante');
      }

      setExitoGlobal(`¡Pago de ${datosEditados.observaciones_ia || comprobanteActual.num_operacion} guardado con éxito!`);
      const nuevosPendientes = pendientes.filter((p) => p.id !== comprobanteActual.id);
      setPendientes(nuevosPendientes);
      setTotalPendientes((prev) => Math.max(0, prev - 1));
      setComprobanteActual(nuevosPendientes.length > 0 ? nuevosPendientes[0] : null);
    } catch (err: any) {
      setErrorGlobal(err.message);
    }
  };

  const handleRechazar = async (motivo: string) => {
    if (!comprobanteActual) return;
    setErrorGlobal(null);

    try {
      const res = await fetch(`/api/comprobantes/${comprobanteActual.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RECHAZAR', motivo_rechazo: motivo })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No fue posible descartar el comprobante');
      }

      setExitoGlobal(`El comprobante fue descartado.`);
      const nuevosPendientes = pendientes.filter((p) => p.id !== comprobanteActual.id);
      setPendientes(nuevosPendientes);
      setTotalPendientes((prev) => Math.max(0, prev - 1));
      setComprobanteActual(nuevosPendientes.length > 0 ? nuevosPendientes[0] : null);
    } catch (err: any) {
      setErrorGlobal(err.message);
    }
  };

  // Función auxiliar para remover tildes y caracteres diacríticos
  const normalizarTexto = (texto: string): string => {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\ufffd/g, 'o')
      .trim()
      .toUpperCase();
  };

  // Limpiar glosas bancarias comunes (remueve RUTs, prefijos "Transf a", "Transf de", "Transf.", etc.)
  const limpiarGlosaBancaria = (glosa: string): string => {
    if (!glosa) return '';
    let limpio = String(glosa)
      .replace(/^0?\d{7,9}[0-9kK]?\s*/i, '') // Quita el RUT inicial
      .replace(/\ufffd/g, 'ó')               // Corrige caracteres con tildes descompuestas en PDFs (ej. EduardoLeón)
      .trim();

    const sinPrefijos = limpio
      .replace(/^(transf\.|transferencia|trf\.|transf\s+a|transf\s+de|pagoproveedor)\s*/i, '')
      .trim();

    if (sinPrefijos.length > 2) limpio = sinPrefijos;
    return limpio;
  };

  // Mapa inteligente de RUT a mejor nombre descriptivo (ej: si un movimiento dice "0129740310 Transf." y otro dice "0129740310 Transf a EduardoLeón", asociar ambos a EduardoLeón)
  const rutNombresMapa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pendientes) {
      if (!p.rut_emisor) continue;
      const nombreLimpio = limpiarGlosaBancaria(p.observaciones_ia || '');
      if (!nombreLimpio || nombreLimpio.toLowerCase() === 'transf.') continue;

      const actual = mapa.get(p.rut_emisor) || '';
      // Priorizar nombres legibles completos (ej: EduardoLeón) sobre glosas cortas
      if (
        !actual ||
        (nombreLimpio.length > actual.length && !nombreLimpio.toLowerCase().startsWith('transf')) ||
        (!actual.toLowerCase().includes('leon') && nombreLimpio.toLowerCase().includes('leon'))
      ) {
        mapa.set(p.rut_emisor, nombreLimpio);
      }
    }
    return mapa;
  }, [pendientes]);

  // Extraer el nombre de cliente más limpio desde la glosa, cliente o mapa de RUT
  const getNombreIdentificador = (p: any): string => {
    if (p.cliente?.nombre) return p.cliente.nombre;
    if (p.cliente_nombre) return p.cliente_nombre;

    if (p.rut_emisor && rutNombresMapa.has(p.rut_emisor)) {
      return rutNombresMapa.get(p.rut_emisor)!;
    }

    if (p.observaciones_ia) {
      const limpio = limpiarGlosaBancaria(p.observaciones_ia);
      if (limpio.length > 0) return limpio;
    }

    return p.num_operacion ? `Op. #${p.num_operacion}` : 'Sin Nombre';
  };

  // Obtiene la posición (página y línea original) de un comprobante dentro del PDF
  const getPosicionComprobante = (comp: any) => {
    if (!comp) return null;
    const key = `${comp.num_operacion}_${comp.monto}`;
    const enMapa = mapaPaginas[key];
    if (enMapa) {
      return { pagina: enMapa.p, lineaOriginal: enMapa.l };
    }
    if (comp.datos_ia_raw?.pagina) {
      return {
        pagina: comp.datos_ia_raw.pagina,
        lineaOriginal: comp.datos_ia_raw.linea_original || comp.observaciones_ia
      };
    }
    return null;
  };

  const infoPosicionActual = useMemo(() => {
    return getPosicionComprobante(comprobanteActual);
  }, [comprobanteActual, mapaPaginas]);

  // Clave única de agrupación (agrupa por RUT si existe o por Nombre normalizado sin tildes)
  const getClaveAgrupacion = (p: any): string => {
    if (p.rut_emisor) return `RUT:${p.rut_emisor.toUpperCase()}`;
    const nombre = getNombreIdentificador(p);
    return `NOM:${normalizarTexto(nombre)}`;
  };

  // Agrupación pura por Cliente / Pagador
  const tablaHistorialClientes = useMemo(() => {
    const mapa = new Map<
      string,
      {
        clave: string;
        nombre: string;
        rut: string | null;
        totalMonto: number;
        cantidad: number;
        movimientos: any[];
      }
    >();

    for (const p of pendientes) {
      const clave = getClaveAgrupacion(p);
      const nombre = getNombreIdentificador(p);
      const rut = p.rut_emisor || null;

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          nombre: nombre.trim(),
          rut,
          totalMonto: 0,
          cantidad: 0,
          movimientos: []
        });
      }

      const grupo = mapa.get(clave)!;
      // Actualizar nombre si encontramos uno mejor o con mayúsculas/minúsculas más limpias
      if (nombre && nombre.length > grupo.nombre.length && !nombre.toLowerCase().startsWith('transf')) {
        grupo.nombre = nombre.trim();
      }
      if (!grupo.rut && rut) grupo.rut = rut;

      grupo.totalMonto += Number(p.monto) || 0;
      grupo.cantidad += 1;
      grupo.movimientos.push(p);
    }

    return Array.from(mapa.values()).sort((a, b) => b.totalMonto - a.totalMonto);
  }, [pendientes, rutNombresMapa]);

  // Filtrado de la tabla de clientes por búsqueda (insensible a tildes y mayúsculas)
  const tablaClientesFiltrada = useMemo(() => {
    if (!busqueda.trim()) return tablaHistorialClientes;
    const qNorm = normalizarTexto(busqueda);
    const qRaw = busqueda.toLowerCase().trim();

    return tablaHistorialClientes.filter((c) => {
      const nombreNorm = normalizarTexto(c.nombre);
      const rutNorm = normalizarTexto(c.rut || '');
      return (
        nombreNorm.includes(qNorm) ||
        rutNorm.includes(qNorm) ||
        String(c.totalMonto).includes(qRaw) ||
        c.movimientos.some((m) =>
          String(m.monto).includes(qRaw) ||
          normalizarTexto(String(m.num_operacion || '')).includes(qNorm) ||
          normalizarTexto(String(m.observaciones_ia || '')).includes(qNorm)
        )
      );
    });
  }, [tablaHistorialClientes, busqueda]);

  // Movimientos pendientes filtrados
  const movimientosAMostrar = useMemo(() => {
    let base = pendientes;
    if (clienteGrupoFiltro) {
      base = base.filter((p) => getClaveAgrupacion(p) === clienteGrupoFiltro);
    }
    if (!busqueda.trim()) return base;
    const qNorm = normalizarTexto(busqueda);
    const qRaw = busqueda.toLowerCase().trim();

    return base.filter((p) => {
      const nombre = getNombreIdentificador(p);
      const nombreNorm = normalizarTexto(nombre);
      const obsNorm = normalizarTexto(p.observaciones_ia || '');
      const monto = String(p.monto || '');
      const op = String(p.num_operacion || '').toLowerCase();

      return nombreNorm.includes(qNorm) || obsNorm.includes(qNorm) || monto.includes(qRaw) || op.includes(qRaw);
    });
  }, [pendientes, clienteGrupoFiltro, busqueda, rutNombresMapa]);

  const totalMontoGeneral = useMemo(() => {
    return pendientes.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  }, [pendientes]);

  return (
    <div className="space-y-5">
      {/* Barra superior de acciones */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Detección de Pagos e Historial por Cliente
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detecta automáticamente transferencias y pagos desde PDF/fotos y genera la tabla de abonos agrupada por cliente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarPendientes}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200"
            title="Refrescar pagos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow active:scale-95">
            <Upload className="w-4 h-4" />
            <span>{cargando ? 'Extrayendo pagos...' : 'Subir Cartola o Comprobante (PDF)'}</span>
            <input
              ref={fileInputRef}
              type="file"
              disabled={cargando}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSubirArchivo(f);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Alertas Globales de Error / Éxito */}
      {errorGlobal && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Atención</p>
            <p className="mt-0.5">{errorGlobal}</p>
          </div>
          <button
            onClick={() => setErrorGlobal(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {exitoGlobal && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{exitoGlobal}</span>
          </div>
          <button
            onClick={() => setExitoGlobal(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas Resumen de Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Clientes con Pagos Detectados</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{tablaHistorialClientes.length}</p>
          <span className="text-[11px] text-slate-500">Agrupados por pagador</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total de Transferencias</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{pendientes.length}</p>
          <span className="text-[11px] text-slate-500">Movimientos en el PDF</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Monto Total Recibido</span>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            ${totalMontoGeneral.toLocaleString('es-CL')}
          </p>
          <span className="text-[11px] text-slate-500">Suma total de abonos</span>
        </div>
      </div>

      {/* Pestañas Principales: Tabla Historial por Cliente vs Revisión de Documento */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTabActual('TABLA_CLIENTES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                tabActual === 'TABLA_CLIENTES'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Tabla de Historial por Cliente ({tablaHistorialClientes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabActual('REVISION_PDF')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                tabActual === 'REVISION_PDF'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Revisar y Asignar Nombre ({pendientes.length})</span>
            </button>
          </div>

          {/* Buscador Rápido por Nombre o Monto */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente o monto..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: TABLA DE HISTORIAL POR CLIENTE */}
        {tabActual === 'TABLA_CLIENTES' && (
          <div className="p-4 space-y-4">
            {clienteGrupoFiltro && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span>
                  Filtrando movimientos de:{' '}
                  <strong>
                    {tablaHistorialClientes.find((g) => g.clave === clienteGrupoFiltro)?.nombre || clienteGrupoFiltro}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setClienteGrupoFiltro(null)}
                  className="font-bold underline text-blue-700 hover:text-blue-900"
                >
                  Ver todos los clientes
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Cliente / Pagador</th>
                    <th className="py-3 px-4 text-center">N° Movimientos este mes</th>
                    <th className="py-3 px-4 text-right">Monto Total Transferido</th>
                    <th className="py-3 px-4 text-center">Detalle de Operaciones</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tablaClientesFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No hay pagos registrados o que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    tablaClientesFiltrada.map((item) => (
                      <tr key={item.clave} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                              <Building2 className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{item.nombre}</p>
                              {item.rut && <p className="text-[10px] text-slate-400 font-mono">RUT: {item.rut}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-slate-800 font-bold">
                            {item.cantidad} {item.cantidad === 1 ? 'abono' : 'abonos'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          ${item.totalMonto.toLocaleString('es-CL')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                            {item.movimientos.slice(0, 3).map((m: any, idx: number) => (
                              <span
                                key={m.id || idx}
                                className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600"
                              >
                                ${m.monto?.toLocaleString('es-CL')}
                              </span>
                            ))}
                            {item.movimientos.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                +{item.movimientos.length - 3} más
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setClienteGrupoFiltro(item.clave);
                              if (item.movimientos.length > 0) {
                                setComprobanteActual(item.movimientos[0]);
                              }
                              setTabActual('REVISION_PDF');
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs transition-colors"
                          >
                            Revisar en PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REVISIÓN DE PAGOS Y FORMULARIO */}
        {tabActual === 'REVISION_PDF' && (
          <div className="p-4 space-y-4">
            {/* Notificación si hay filtro de cliente activo */}
            {clienteGrupoFiltro && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span>
                  Revisando pagos filtrados de:{' '}
                  <strong>
                    {tablaHistorialClientes.find((g) => g.clave === clienteGrupoFiltro)?.nombre || clienteGrupoFiltro}
                  </strong>{' '}
                  ({movimientosAMostrar.length} movimientos)
                </span>
                <button
                  type="button"
                  onClick={() => setClienteGrupoFiltro(null)}
                  className="font-bold underline text-blue-700 hover:text-blue-900"
                >
                  Ver todos los comprobantes
                </button>
              </div>
            )}

            {/* Barra de Navegación y Selector de Movimientos Mejorada */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Información del movimiento seleccionado actualmente */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <button
                    type="button"
                    disabled={movimientosAMostrar.findIndex((m) => m.id === comprobanteActual?.id) <= 0}
                    onClick={() => {
                      const idx = movimientosAMostrar.findIndex((m) => m.id === comprobanteActual?.id);
                      if (idx > 0) setComprobanteActual(movimientosAMostrar[idx - 1]);
                    }}
                    className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-slate-700 transition-colors"
                    title="Movimiento anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 text-xs font-mono font-bold text-slate-700 select-none">
                    {Math.max(1, movimientosAMostrar.findIndex((m) => m.id === comprobanteActual?.id) + 1)} /{' '}
                    {movimientosAMostrar.length}
                  </span>

                  <button
                    type="button"
                    disabled={
                      movimientosAMostrar.findIndex((m) => m.id === comprobanteActual?.id) >=
                      movimientosAMostrar.length - 1
                    }
                    onClick={() => {
                      const idx = movimientosAMostrar.findIndex((m) => m.id === comprobanteActual?.id);
                      if (idx >= 0 && idx < movimientosAMostrar.length - 1) {
                        setComprobanteActual(movimientosAMostrar[idx + 1]);
                      }
                    }}
                    className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-slate-700 transition-colors"
                    title="Siguiente movimiento"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {comprobanteActual ? getNombreIdentificador(comprobanteActual) : 'Sin selección'}
                    </span>
                    {comprobanteActual?.rut_emisor && (
                      <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {comprobanteActual.rut_emisor}
                      </span>
                    )}
                  </div>
                  {comprobanteActual && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        ${Number(comprobanteActual.monto || 0).toLocaleString('es-CL')}
                      </span>
                      {comprobanteActual.num_operacion && (
                        <span className="text-[11px] font-mono text-slate-500">
                          Op: #{comprobanteActual.num_operacion}
                        </span>
                      )}
                      {infoPosicionActual?.pagina && (
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          Pág. {infoPosicionActual.pagina}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón para desplegar todos los movimientos en una vista limpia */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarListaMovimientos((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                    mostrarListaMovimientos
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>
                    {mostrarListaMovimientos
                      ? 'Ocultar listado de movimientos'
                      : `Ver los ${movimientosAMostrar.length} movimientos`}
                  </span>
                </button>
              </div>
            </div>

            {/* Listado desplegable / cuadrícula ordenada cuando el usuario desea verlos todos */}
            {mostrarListaMovimientos && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Selecciona un movimiento para revisarlo en el visor:
                  </span>
                  <span>{movimientosAMostrar.length} disponibles</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 scrollbar-thin">
                  {movimientosAMostrar.map((p, idx) => {
                    const activo = comprobanteActual?.id === p.id;
                    const nombre = getNombreIdentificador(p);
                    const posItem = getPosicionComprobante(p);
                    const fechaFmt = p.fecha_transaccion
                      ? new Date(p.fecha_transaccion).toLocaleDateString('es-CL')
                      : null;
                    return (
                      <button
                        key={p.id || idx}
                        type="button"
                        onClick={() => {
                          setComprobanteActual(p);
                          setMostrarListaMovimientos(false);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                          activo
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="font-bold text-xs truncate">{nombre}</span>
                          <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                        </div>
                        <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200/50">
                          <span className="font-mono font-bold text-xs text-emerald-700">
                            ${Number(p.monto || 0).toLocaleString('es-CL')}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            {posItem?.pagina && (
                              <span className="text-blue-600 font-bold bg-blue-50 px-1 rounded">
                                Pág. {posItem.pagina}
                              </span>
                            )}
                            <span>{fechaFmt || `Op. ${p.num_operacion || 'S/N'}`}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visor y Formulario */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] pt-2">
              <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
                <DocumentViewer
                  url={comprobanteActual?.url_archivo || null}
                  mimeType={comprobanteActual?.mime_type}
                  nombreArchivo={comprobanteActual?.nombre_archivo}
                  pagina={infoPosicionActual?.pagina}
                  lineaOriginal={infoPosicionActual?.lineaOriginal}
                  monto={comprobanteActual?.monto}
                  numOperacion={comprobanteActual?.num_operacion}
                  fechaTransaccion={comprobanteActual?.fecha_transaccion}
                  nombreTitular={comprobanteActual ? getNombreIdentificador(comprobanteActual) : null}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col h-full">
                {cargando ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[480px] bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                    <div className="p-3 bg-blue-50 rounded-2xl mb-4">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">Procesando documento...</h3>
                  </div>
                ) : (
                  <ComprobanteForm
                    comprobante={comprobanteActual}
                    clientes={clientes}
                    onConciliar={handleConciliar}
                    onRechazar={handleRechazar}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
