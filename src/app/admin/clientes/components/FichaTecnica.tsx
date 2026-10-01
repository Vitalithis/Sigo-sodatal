'use client';

import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<Tab>('equipos');
  const incidenciasPendientes = cliente.incidencias?.filter((i: any) => !i.resuelta).length ?? 0;

  const tabProps = { cliente, onClienteUpdate, showSuccess, showError, showConfirm };

  const tieneDeuda = (cliente.deuda || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop con desenfoque de cristal */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Panel lateral deslizante (Drawer) */}
      <div className="relative bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 z-10">

        {/* CABECERA CORPORATIVA Y PERFIL CLIENTE */}
        <div className="p-6 text-white flex flex-col gap-4 flex-shrink-0 relative overflow-hidden shadow-md" style={{ backgroundColor: '#013299' }}>
          
          {/* Fila superior: Título y Cerrar */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-black text-amber-300 shrink-0">
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-blue-100 px-2 py-0.5 rounded-md">
                    Ficha Técnica de Cliente
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    cliente.tipo === 'EMPRESA' ? 'bg-purple-400 text-purple-950 font-black' : 'bg-emerald-400 text-emerald-950 font-black'
                  }`}>
                    {cliente.tipo}
                  </span>
                </div>
                <h2 className="text-xl font-black truncate mt-1">{cliente.nombre}</h2>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
              title="Cerrar ficha"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Fila central: Datos de Contacto y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-100/90 bg-white/10 p-3 rounded-xl border border-white/15">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-semibold">{cliente.direccion}</span>
              </div>
              {cliente.sector && (
                <p className="text-[11px] text-blue-200/80 font-medium pl-5">
                  Sector: {cliente.sector.nombre} ({cliente.sector.comuna?.nombre})
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-semibold">{cliente.telefono}</span>
              </div>
              {cliente.email && (
                <div className="flex items-center gap-1.5 truncate text-[11px] text-blue-200">
                  <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{cliente.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fila inferior: Indicadores clave (Frecuencia, Deuda y Envases) */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Frecuencia de Compra */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] uppercase font-bold text-blue-200">Visita:</span>
              <span className="font-black text-amber-300 uppercase text-xs">
                {cliente.frecuencia === 'QUINCENAL' ? 'Quincenal' : cliente.frecuencia === 'MENSUAL' ? 'Mensual' : cliente.frecuencia === 'A_PEDIDO' ? 'A Pedido' : 'Semanal'}
              </span>
            </div>

            {/* Saldo / Deuda */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              tieneDeuda ? 'bg-rose-500/30 border-rose-300 text-rose-200' : 'bg-emerald-500/30 border-emerald-300 text-emerald-200'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{tieneDeuda ? `Deuda: $${Number(cliente.deuda).toLocaleString('es-CL')}` : 'Al día ($0)'}</span>
            </div>

            {/* Envases Prestados */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-bold text-white">
              <Package className="w-3.5 h-3.5 text-amber-300" />
              <span>{cliente.botellones_prestados || 0} envases prestados</span>
            </div>

          </div>

        </div>

        {/* PESTAÑAS NAVEGACIÓN */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 px-2 pt-2 gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-all rounded-t-xl border-t border-x ${
                  isActive
                    ? 'bg-white text-[#013299] border-slate-200 shadow-sm -mb-px'
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#013299]' : 'text-slate-400'}`} />
                {tab.label}

                {tab.key === 'incidencias' && incidenciasPendientes > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ml-1">
                    {incidenciasPendientes}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'equipos'     && <TabDispensadores {...tabProps} />}
          {activeTab === 'compras'     && <TabHistorialCompras cliente={cliente} />}
          {activeTab === 'finanzas'    && <TabFinanzas      cliente={cliente} showSuccess={showSuccess} showError={showError} />}
          {activeTab === 'incidencias' && <TabIncidencias   {...tabProps} />}
        </div>

      </div>
    </div>
  );
}
