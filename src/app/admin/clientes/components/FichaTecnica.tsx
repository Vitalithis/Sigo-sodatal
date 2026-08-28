'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import TabDispensadores from './tabs/TabDispensadores';
import TabTaller        from './tabs/TabTaller';
import TabFinanzas      from './tabs/TabFinanzas';
import TabIncidencias   from './tabs/TabIncidencias';

type Tab = 'equipos' | 'taller' | 'finanzas' | 'incidencias';

interface Props {
  cliente: any;
  onClose: () => void;
  onClienteUpdate: (updater: (prev: any[]) => any[]) => void;
  showSuccess: (t: string, m: string) => void;
  showError: (t: string, m: string) => void;
  showConfirm: (t: string, m: string, fn: () => void) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'equipos',     label: 'Dispensadores' },
  { key: 'taller',      label: 'Taller'        },
  { key: 'finanzas',    label: 'Finanzas'      },
  { key: 'incidencias', label: 'Incidencias'   },
];

export default function FichaTecnica({ cliente, onClose, onClienteUpdate, showSuccess, showError, showConfirm }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('equipos');
  const incidenciasPendientes = cliente.incidencias?.filter((i: any) => !i.resuelta).length ?? 0;

  const tabProps = { cliente, onClienteUpdate, showSuccess, showError, showConfirm };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col border-l border-slate-200">

        {/* Cabecera */}
        <div className="p-5 text-white flex justify-between items-center flex-shrink-0" style={{ backgroundColor: '#013299' }}>
          <div>
            <span className="text-[10px] font-bold opacity-70 tracking-wider uppercase">Ficha Técnica</span>
            <h2 className="text-lg font-bold truncate">{cliente.nombre}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl text-center border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <span className="text-[10px] uppercase tracking-wider opacity-80 block font-bold">Envases Prestados</span>
              <span className="text-base font-extrabold">{cliente.botellones_prestados || 0}</span>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex-1 py-3.5 px-3 text-center text-xs font-semibold whitespace-nowrap transition-colors"
              style={activeTab === tab.key
                ? { color: '#013299', borderBottom: '2px solid #013299', backgroundColor: 'white' }
                : { color: '#64748b' }}
            >
              {tab.label}
              {tab.key === 'incidencias' && incidenciasPendientes > 0 && (
                <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {incidenciasPendientes}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'equipos'     && <TabDispensadores {...tabProps} />}
          {activeTab === 'taller'      && <TabTaller        {...tabProps} />}
          {activeTab === 'finanzas'    && <TabFinanzas      cliente={cliente} showSuccess={showSuccess} showError={showError} />}
          {activeTab === 'incidencias' && <TabIncidencias   {...tabProps} />}
        </div>
      </div>
    </div>
  );
}