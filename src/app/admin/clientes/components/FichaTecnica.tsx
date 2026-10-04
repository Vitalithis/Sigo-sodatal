'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Mail, MapPin, Building2, Calendar, ShieldAlert, Package, DollarSign, Clock, AlertTriangle, ShoppingBag } from 'lucide-react';
import TabDispensadores from '@/app/admin/dispensadores/components/tabs/TabDispensadores';
import TabFinanzas      from '@/app/admin/dispensadores/components/tabs/TabFinanzas';
import TabIncidencias   from '@/app/admin/dispensadores/components/tabs/TabIncidencias';
import TabHistorialCompras from './tabs/TabHistorialCompras';

type Tab = 'equipos' | 'compras' | 'finanzas' | 'incidencias';

interface Props {
  cliente: any;
  onClose: () => void;
  onClienteUpdate: (updater: (prev: any[]) => any[]) => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'equipos',     label: 'Dispensadores', icon: Building2 },
  { key: 'compras',     label: 'Compras',       icon: ShoppingBag },
  { key: 'finanzas',    label: 'Finanzas',      icon: DollarSign },
  { key: 'incidencias', label: 'Incidencias',   icon: AlertTriangle },
];

export default function FichaTecnica({ 
  cliente, 
  onClose, 
  onClienteUpdate, 
  showSuccess, 
  showError, 
  showConfirm 
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('equipos');
  const incidenciasPendientes = cliente.incidencias?.filter((i: any) => !i.resuelta).length ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const tabProps = { cliente, onClienteUpdate, showSuccess, showError, showConfirm };
  const tieneDeuda = (cliente.deuda || 0) > 0;

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden !m-0 !top-0 !left-0 !right-0 !bottom-0">
      {/* Backdrop con desenfoque de cristal */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200 !m-0 !top-0 !left-0 !right-0 !bottom-0 cursor-pointer" 
        onClick={onClose} 
      />

      {/* Panel lateral deslizante (Drawer) */}
      <div className="relative bg-white w-full max-w-2xl h-full max-h-screen shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 z-10 overflow-hidden !m-0">

        {/* CABECERA CORPORATIVA COMPACTA (Máximo 1/5 de la vista) */}
        <div 
          className="px-5 pt-3.5 pb-3 text-white flex flex-col justify-between flex-shrink-0 shadow-sm border-b border-blue-900/30 relative z-20"
          style={{ backgroundColor: '#013299' }}
        >
          {/* Fila superior: Avatar, Nombre, Tipo y Botón Cerrar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-sm font-black text-amber-300 shrink-0">
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white truncate" title={cliente.nombre}>
                  {cliente.nombre}
                </h2>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                  cliente.tipo === 'EMPRESA' 
                    ? 'bg-purple-300 text-purple-950' 
                    : 'bg-emerald-300 text-emerald-950'
                }`}>
                  {cliente.tipo}
                </span>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/80 hover:text-white shrink-0"
              title="Cerrar ficha"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Fila central: Dirección y Contacto compactos en una sola línea */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-blue-100/90 mt-2">
            <div className="flex items-center gap-1 truncate max-w-[280px]">
              <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">{cliente.direccion}{cliente.sector ? ` • ${cliente.sector.nombre}` : ''}</span>
            </div>
            {cliente.telefono && (
              <div className="flex items-center gap-1 shrink-0">
                <Phone className="w-3 h-3 text-amber-300 shrink-0" />
                <span>{cliente.telefono}</span>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-1 truncate max-w-[220px] text-blue-200">
                <Mail className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="truncate">{cliente.email}</span>
              </div>
            )}
          </div>

          {/* Fila inferior: Indicadores clave (Frecuencia, Deuda y Envases) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Frecuencia de Compra */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/15 border border-white/20 text-[10px] font-bold">
              <Clock className="w-3 h-3 text-amber-300" />
              <span className="text-blue-200">Visita:</span>
              <span className="text-amber-300 uppercase font-black">
                {cliente.frecuencia === 'QUINCENAL' ? 'Quincenal' : cliente.frecuencia === 'MENSUAL' ? 'Mensual' : cliente.frecuencia === 'A_PEDIDO' ? 'A Pedido' : 'Semanal'}
              </span>
            </div>

            {/* Saldo / Deuda */}
            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${
              tieneDeuda ? 'bg-rose-500/30 border-rose-300 text-rose-100' : 'bg-emerald-500/30 border-emerald-300 text-emerald-100'
            }`}>
              <ShieldAlert className="w-3 h-3" />
              <span>{tieneDeuda ? `Deuda: $${Number(cliente.deuda).toLocaleString('es-CL')}` : 'Al día ($0)'}</span>
            </div>

            {/* Envases Prestados */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/15 border border-white/20 text-[10px] font-bold text-white">
              <Package className="w-3 h-3 text-amber-300" />
              <span>{cliente.botellones_prestados || 0} envases</span>
            </div>
          </div>

        </div>

        {/* PESTAÑAS DE NAVEGACIÓN SIN SCROLL (grid simétrico de 4 columnas) */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 flex-shrink-0 px-3 pt-1.5 gap-1 overflow-hidden">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs transition-all rounded-t-xl border-t border-x ${
                  isActive
                    ? 'bg-white text-[#013299] border-slate-200 shadow-xs -mb-px font-black'
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100 font-bold'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#013299]' : 'text-slate-400'}`} />
                <span className="truncate">{tab.label}</span>

                {tab.key === 'incidencias' && incidenciasPendientes > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-none shrink-0">
                    {incidenciasPendientes}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
          {activeTab === 'equipos'     && <TabDispensadores {...tabProps} />}
          {activeTab === 'compras'     && <TabHistorialCompras cliente={cliente} />}
          {activeTab === 'finanzas'    && <TabFinanzas      cliente={cliente} showSuccess={showSuccess} showError={showError} />}
          {activeTab === 'incidencias' && <TabIncidencias   {...tabProps} />}
        </div>

      </div>
    </div>,
    document.body
  );
}
