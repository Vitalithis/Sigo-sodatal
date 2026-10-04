'use client';

import React from 'react';
import { Package, Droplets, Sparkles } from 'lucide-react';

interface Props {
  resumen: any;
}

export default function GraficoComisionesBarras({ resumen }: Props) {
  const natural = resumen?.natural || {};
  const empresa = resumen?.empresa || {};

  const b20Nat = Number(natural.bot20L || 0);
  const b20Emp = Number(empresa.bot20L || 0);
  const b20Total = b20Nat + b20Emp;

  const b10Nat = Number(natural.bot10L || 0);
  const b10Emp = Number(empresa.bot10L || 0);
  const b10Total = b10Nat + b10Emp;

  const sodaNat = Number(natural.soda || 0);
  const sodaEmp = Number(empresa.soda || 0);
  const sodaTotal = sodaNat + sodaEmp;

  const totalNat = b20Nat + b10Nat + sodaNat;
  const totalEmp = b20Emp + b10Emp + sodaEmp;
  const totalGeneral = totalNat + totalEmp;

  const grupos = [
    {
      id: 'bot20',
      nombre: 'bot 20 lt',
      natural: b20Nat,
      empresa: b20Emp,
      total: b20Total,
    },
    {
      id: 'bot10',
      nombre: 'bot 10 lts',
      natural: b10Nat,
      empresa: b10Emp,
      total: b10Total,
    },
    {
      id: 'soda',
      nombre: 'soda',
      natural: sodaNat,
      empresa: sodaEmp,
      total: sodaTotal,
    },
  ];

  // Escala del Eje Y
  const maxCant = Math.max(b20Nat, b20Emp, b10Nat, b10Emp, sodaNat, sodaEmp, 1);
  const yMax = Math.max(Math.ceil((maxCant * 1.15) / 5) * 5, 5);
  const yTicks = [
    yMax,
    Math.round(yMax * 0.75),
    Math.round(yMax * 0.5),
    Math.round(yMax * 0.25),
    0,
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      
      {/* Encabezado: Título y Leyenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            Cantidad de entregas
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Suma de productos entregados separados por tipo de cliente (Empresa / Natural)
          </p>
        </div>

        {/* Leyenda común */}
        <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs" />
            <span className="text-slate-700">Natural ({totalNat})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shadow-xs" />
            <span className="text-slate-700">Empresa ({totalEmp})</span>
          </div>
        </div>
      </div>

      {/* ── SUMA DE LOS PRODUCTOS POR SEPARADO (TARJETAS RESUMEN) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Botellón 20L */}
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-600" />
              Botellón 20L
            </span>
            <span className="text-sm font-black text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-lg">
              {b20Total} un.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-200/60 font-bold">
            <div className="text-emerald-800">
              <span className="text-[10px] text-emerald-600 block">Natural</span>
              {b20Nat} un.
            </div>
            <div className="text-blue-800">
              <span className="text-[10px] text-blue-600 block">Empresa</span>
              {b20Emp} un.
            </div>
          </div>
        </div>

        {/* Botellón 10L */}
        <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="h-4 w-4 text-slate-600" />
              Botellón 10L
            </span>
            <span className="text-sm font-black text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-lg">
              {b10Total} un.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200 font-bold">
            <div className="text-emerald-800">
              <span className="text-[10px] text-emerald-600 block">Natural</span>
              {b10Nat} un.
            </div>
            <div className="text-blue-800">
              <span className="text-[10px] text-blue-600 block">Empresa</span>
              {b10Emp} un.
            </div>
          </div>
        </div>

        {/* Soda / Sifón */}
        <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-cyan-950 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              Soda / Sifón
            </span>
            <span className="text-sm font-black text-cyan-900 bg-cyan-100/80 px-2 py-0.5 rounded-lg">
              {sodaTotal} un.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-cyan-200/60 font-bold">
            <div className="text-emerald-800">
              <span className="text-[10px] text-emerald-600 block">Natural</span>
              {sodaNat} un.
            </div>
            <div className="text-blue-800">
              <span className="text-[10px] text-blue-600 block">Empresa</span>
              {sodaEmp} un.
            </div>
          </div>
        </div>
      </div>

      {/* ── ÁREA DEL GRÁFICO CON EJE Y Y EJE X ── */}
      <div className="relative pt-6 pb-2">
        <div className="flex">
          {/* Eje Y: Cantidades */}
          <div className="w-12 h-64 flex flex-col justify-between items-end pr-2.5 text-[11px] font-bold text-slate-400 select-none">
            {yTicks.map((tick, idx) => (
              <span key={idx} className="leading-none">
                {tick}
              </span>
            ))}
          </div>

          {/* Gráfico principal con barras */}
          <div className="flex-1 h-64 relative border-l border-b border-slate-200">
            {/* Líneas horizontales de guía */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {yTicks.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-full border-b ${
                    idx === yTicks.length - 1
                      ? 'border-transparent'
                      : 'border-slate-100'
                  }`}
                />
              ))}
            </div>

            {/* Columnas del Eje X: bot 20 lt, bot 10 lts, soda */}
            <div className="absolute inset-0 grid grid-cols-3 gap-4 px-4 sm:px-8 items-end">
              {grupos.map((g) => {
                const hNat = (g.natural / yMax) * 100;
                const hEmp = (g.empresa / yMax) * 100;

                return (
                  <div
                    key={g.id}
                    className="h-full flex items-end justify-center gap-2 sm:gap-3 group"
                  >
                    {/* Barra Natural */}
                    <div className="flex-1 max-w-[56px] flex flex-col items-center justify-end h-full">
                      <span className="text-xs sm:text-sm font-black text-emerald-700 mb-1 transition-transform group-hover:scale-110">
                        {g.natural}
                      </span>
                      <div
                        style={{ height: `${Math.max(hNat, g.natural > 0 ? 3 : 0)}%` }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-300 shadow-xs relative"
                        title={`Natural: ${g.natural} unidades`}
                      />
                      <span className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase">
                        Nat
                      </span>
                    </div>

                    {/* Barra Empresa */}
                    <div className="flex-1 max-w-[56px] flex flex-col items-center justify-end h-full">
                      <span className="text-xs sm:text-sm font-black text-blue-700 mb-1 transition-transform group-hover:scale-110">
                        {g.empresa}
                      </span>
                      <div
                        style={{ height: `${Math.max(hEmp, g.empresa > 0 ? 3 : 0)}%` }}
                        className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all duration-300 shadow-xs relative"
                        title={`Empresa: ${g.empresa} unidades`}
                      />
                      <span className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase">
                        Emp
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Eje X: Etiquetas principales centradas bajo cada grupo con su total */}
        <div className="grid grid-cols-3 gap-4 ml-12 px-4 sm:px-8 pt-3 text-center">
          {grupos.map((g) => (
            <div key={g.id} className="space-y-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide block uppercase">
                {g.nombre}
              </span>
              <div className="inline-block bg-slate-100 border border-slate-200/80 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700">
                Total: <span className="font-black text-slate-900">{g.total} un.</span>
                <span className="block text-[10px] text-slate-500 font-medium">
                  Emp: {g.empresa} / Nat: {g.natural}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen Total General al pie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-3">
          <span>Totales del período:</span>
          <span className="text-emerald-700 font-extrabold">Natural: {totalNat} un.</span>
          <span className="text-blue-700 font-extrabold">Empresa: {totalEmp} un.</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Suma Total Entregas:</span>
          <span className="text-sm font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
            {totalGeneral} unidades
          </span>
        </div>
      </div>

    </div>
  );
}
