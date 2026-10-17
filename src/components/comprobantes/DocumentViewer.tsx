'use client';

import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  Copy,
  Check,
  Search,
  RotateCcw
} from 'lucide-react';

interface DocumentViewerProps {
  url: string | null;
  mimeType?: string;
  nombreArchivo?: string;
  pagina?: number | null;
  lineaOriginal?: string | null;
  monto?: number | null;
  numOperacion?: string | null;
  fechaTransaccion?: string | null;
  nombreTitular?: string | null;
}

export default function DocumentViewer({
  url,
  mimeType,
  nombreArchivo,
  pagina,
  lineaOriginal,
  monto,
  numOperacion,
  fechaTransaccion,
  nombreTitular
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotacion, setRotacion] = useState<number>(0);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Cada vez que cambia la página o la operación, resetear el feedback de copiado
  useEffect(() => {
    setCopiado(false);
  }, [pagina, numOperacion]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 p-8">
        <FileText className="w-16 h-16 mb-3 stroke-[1.2] text-slate-300" />
        <p className="font-medium text-slate-600">Ningún comprobante cargado</p>
        <p className="text-xs text-slate-400 mt-1">Sube o selecciona un comprobante para revisarlo aquí</p>
      </div>
    );
  }

  const esPdf = mimeType?.includes('pdf') || url.toLowerCase().endsWith('.pdf');
  const paginaActiva = pagina && pagina > 0 ? pagina : 1;

  // Parámetros de URL para el visor PDF del navegador: salta directo a la página
  const iframeSrc = esPdf ? `${url}#page=${paginaActiva}&view=FitH&toolbar=1` : url;

  const copiarBusqueda = () => {
    // Copiar numOperacion o monto para que el usuario pueda usar Ctrl+F si lo desea
    const textoACopiar = numOperacion || (monto ? Number(monto).toLocaleString('es-CL') : '');
    if (textoACopiar && navigator.clipboard) {
      navigator.clipboard.writeText(textoACopiar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
      {/* Barra de herramientas superior */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 backdrop-blur border-b border-slate-800 text-slate-300 gap-2">
        <div className="flex items-center gap-2 text-xs truncate max-w-[260px]">
          {esPdf ? (
            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="truncate font-medium">{nombreArchivo || 'Comprobante de Pago'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {esPdf && pagina ? (
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Pág.</span>
              <span className="font-bold font-mono text-emerald-400">{pagina}</span>
            </div>
          ) : null}

          {!esPdf && (
            <>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-1.5 text-slate-400">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotacion((prev) => (prev + 90) % 360)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 ml-1"
                title="Rotar 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {esPdf && (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              title="Volver a enfocar la página de esta operación"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <a
            href={`${url}${esPdf && pagina ? `#page=${pagina}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 ml-1"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Franja de Identificación y Marcador de la Operación Seleccionada */}
      {esPdf && (lineaOriginal || pagina || monto) && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 p-2.5 px-4 text-xs text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] shrink-0 font-mono">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Página {paginaActiva}
            </span>

            {monto ? (
              <span className="font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded shrink-0">
                ${Number(monto).toLocaleString('es-CL')}
              </span>
            ) : null}

            {numOperacion && (
              <span className="font-mono text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                Op. #{numOperacion}
              </span>
            )}

            {lineaOriginal && (
              <span
                className="text-slate-300 font-mono text-[11px] truncate bg-black/40 px-2 py-0.5 rounded border border-white/5"
                title={lineaOriginal}
              >
                {lineaOriginal}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {(numOperacion || monto) && (
              <button
                type="button"
                onClick={copiarBusqueda}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 hover:text-white rounded-lg text-[11px] transition-all font-medium"
                title="Copiar N° de Operación o Monto para buscar rápido con Ctrl+F en la página"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? '¡Copiado (Ctrl+F)!' : 'Copiar para Ctrl+F'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Área del documento / Iframe */}
      <div className="flex-1 overflow-hidden p-2 flex items-center justify-center bg-slate-900/50 min-h-[500px]">
        {esPdf ? (
          <iframe
            key={`${url}-p${paginaActiva}-${reloadKey}`}
            src={iframeSrc}
            className="w-full h-full min-h-[560px] rounded-lg border-0 bg-white"
            title="Visor PDF"
          />
        ) : (
          <div className="transition-transform duration-200 ease-out origin-center flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Comprobante"
              style={{
                transform: `scale(${zoom}) rotate(${rotacion}deg)`,
                maxHeight: '75vh'
              }}
              className="rounded-lg shadow-2xl object-contain select-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
