'use client';

import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool, Check } from 'lucide-react';

interface FirmaCanvasProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
  readOnly?: boolean;
}

export default function FirmaCanvas({
  value,
  onChange,
  height = 160,
  readOnly = false,
}: FirmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Inicializar dimensiones con soporte para pantallas Retina (DPI alto)
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a'; // slate-900

      // Si ya hay un valor (imagen en base64) y no se ha dibujado encima, renderizarlo
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, height);
          ctx.drawImage(img, 0, 0, rect.width, height);
          setHasDrawn(true);
        };
        img.src = value;
      }
    }
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [value, height]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      // Prevenir scroll en móviles al firmar
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div 
        className={`relative w-full rounded-xl border bg-slate-50/70 overflow-hidden transition-all select-none ${
          readOnly 
            ? 'border-slate-200 cursor-default' 
            : hasDrawn 
              ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-white' 
              : 'border-slate-300 hover:border-[#013299] focus-within:border-[#013299]'
        }`}
        style={{ height: `${height}px`, touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-full block ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
        />

        {/* Indicador / Guía de firma cuando está vacío */}
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
            <PenTool className="w-5 h-5 text-slate-300 animate-pulse" />
            <p className="text-xs font-semibold text-slate-500">
              {readOnly ? 'Sin firma digital registrada' : 'Firmar aquí con el dedo o mouse'}
            </p>
            <p className="text-[10px] text-slate-400">
              Mantén presionado y dibuja la firma del receptor
            </p>
          </div>
        )}

        {/* Línea sutil de base para la firma */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none" />

        {/* Badge de firmado */}
        {hasDrawn && !readOnly && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
            <Check className="w-3 h-3" />
            Firma capturada
          </div>
        )}

        {/* Botón limpiar */}
        {!readOnly && hasDrawn && (
          <button
            type="button"
            onClick={clearCanvas}
            className="absolute top-2 right-2 bg-white/90 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
            title="Borrar y volver a firmar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px]">Limpiar</span>
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
          <span>El trazo digital se almacenará como respaldo oficial de entrega.</span>
          {hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              className="text-slate-400 hover:text-rose-600 transition-colors font-medium text-[11px] underline"
            >
              Borrar trazo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
