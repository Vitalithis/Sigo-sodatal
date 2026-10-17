'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';

export default function ConciliacionPage() {
  const [comprobanteActual, setComprobanteActual] = useState<any>(null);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [exitoGlobal, setExitoGlobal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de pendientes y clientes al iniciar
  const cargarPendientes = async () => {
    try {
      const res = await fetch('/api/comprobantes?estado=PENDIENTE');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendientes(json.data);
        // Si no hay seleccionado, seleccionar el primero
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
          `¡Cartola procesada con éxito! Se importaron ${json.importados} movimientos de pago (${json.duplicados_omitidos || 0} omitidos por ya existir).`
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
        throw new Error(json.error || 'No fue posible conciliar el comprobante');
      }

      setExitoGlobal(`¡Comprobante #${comprobanteActual.num_operacion} conciliado exitosamente!`);
      // Actualizar lista y seleccionar el siguiente pendiente
      const nuevosPendientes = pendientes.filter((p) => p.id !== comprobanteActual.id);
      setPendientes(nuevosPendientes);
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
        throw new Error(json.error || 'No fue posible rechazar el comprobante');
      }

      setExitoGlobal(`El comprobante fue marcado como RECHAZADO.`);
      const nuevosPendientes = pendientes.filter((p) => p.id !== comprobanteActual.id);
      setPendientes(nuevosPendientes);
      setComprobanteActual(nuevosPendientes.length > 0 ? nuevosPendientes[0] : null);
    } catch (err: any) {
      setErrorGlobal(err.message);
    }
  };

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
              Módulo de Extracción y Conciliación
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lectura automatizada de transferencias y vouchers POS con OCR y búsqueda heurística local (100% Gratis).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarPendientes}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow active:scale-95">
            <Upload className="w-4 h-4" />
            <span>{cargando ? 'Extrayendo con OCR Local...' : 'Subir Comprobante (PDF/Foto)'}</span>
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

      {/* Cola de Pendientes Horizontal */}
      {pendientes.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-600 text-xs font-semibold shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Pendientes ({pendientes.length})</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {pendientes.map((p) => {
              const activo = comprobanteActual?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setComprobanteActual(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all shrink-0 ${
                    activo
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Op. #{p.num_operacion || 'Sin N°'}</span>
                  <span className="font-bold font-mono">${p.monto?.toLocaleString('es-CL')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista Dividida (Split Screen: Visor a la Izquierda, Formulario a la Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Lado Izquierdo (Visor de Archivo) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          <DocumentViewer
            url={comprobanteActual?.url_archivo || null}
            mimeType={comprobanteActual?.mime_type}
            nombreArchivo={comprobanteActual?.nombre_archivo}
          />
        </div>

        {/* Lado Derecho (Formulario Reactivo Pre-llenado) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          {cargando ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[480px] bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="p-3 bg-blue-50 rounded-2xl mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Extrayendo datos con OCR y Python...</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Analizando texto, banco emisor, monto numérico, RUT, fecha y número de operación localmente.
              </p>
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
  );
}
