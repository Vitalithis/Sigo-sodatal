'use client';

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface DocumentViewerProps {
  url: string | null;
  mimeType?: string;
  nombreArchivo?: string;
}

export default function DocumentViewer({ url, mimeType, nombreArchivo }: DocumentViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotacion, setRotacion] = useState<number>(0);

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

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
      {/* Barra de herramientas superior */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 backdrop-blur border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2 text-xs truncate max-w-[240px]">
          {esPdf ? <FileText className="w-4 h-4 text-rose-400 shrink-0" /> : <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="truncate font-medium">{nombreArchivo || 'Comprobante de Pago'}</span>
        </div>

        <div className="flex items-center gap-1">
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

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 ml-2"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Área del documento */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/50 min-h-[500px]">
        {esPdf ? (
          <iframe
            src={`${url}#toolbar=1&view=FitH`}
            className="w-full h-full min-h-[550px] rounded-lg border-0 bg-white"
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
