'use client';

import { useState } from 'react';
import { Factory, FlaskConical, AlertTriangle, CheckCircle, Info, BarChart3 } from 'lucide-react';
import { useProduccionCO2, UsuarioLite, ProduccionRow, TuboRow, ConfigRow } from './hooks/useProduccionCO2';
import { TabProduccion } from './tabs/TabProduccion';
import { TabCO2 } from './tabs/TabCO2';
import { TabReportes } from './tabs/TabReportes'; 

import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface Props {
  produccionInicial: ProduccionRow[];
  tubosIniciales: TuboRow[];
  configInicial: ConfigRow[];
  usuarios: UsuarioLite[];
}

export default function ProduccionCO2Manager(props: Props) {
  const [tab, setTab] = useState<'produccion' | 'co2' | 'reportes'>('produccion');
  
  const { popup, showSuccess, showError, showInfo, showConfirm, close } = usePopup();

  const {
    produccion, tubos, cargando,
    tuboActivo, estadoTubo, umbralAlerta,
    formProduccion, setFormProduccion,
    formTubo, setFormTubo,
    formConfig, setFormConfig,
    manejarCrearProduccion, manejarCrearTubo,
    manejarCerrarTubo, manejarGuardarConfig,
  } = useProduccionCO2({
    ...props,
    notify: { showSuccess, showError, showInfo }
  });

  return (
    <div className="space-y-6">
      <PopupGlobal popup={popup} onClose={close} />

      {/* Pestañas */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'produccion', label: 'Producción diaria', icon: <Factory className="h-3.5 w-3.5" /> },
          { key: 'co2', label: 'CO₂ y tubos', icon: <FlaskConical className="h-3.5 w-3.5" /> },
          { key: 'reportes', label: 'Reportes y KPI', icon: <BarChart3 className="h-3.5 w-3.5" /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === key
                ? 'border-[#283289] text-[#283289] bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Renderizado condicional ajustado para 3 vistas */}
      {tab === 'produccion' ? (
        <TabProduccion
          produccion={produccion}
          form={formProduccion}
          onChange={(u) => setFormProduccion((p) => ({ ...p, ...u }))}
          onSubmit={manejarCrearProduccion}
          usuarios={props.usuarios}
          cargando={cargando}
        />
      ) : tab === 'co2' ? (
        <TabCO2
          tubos={tubos}
          tuboActivo={tuboActivo}
          estadoTubo={estadoTubo}
          umbralAlerta={umbralAlerta}
          formTubo={formTubo}
          onChangeTubo={(u) => setFormTubo((p) => ({ ...p, ...u }))}
          onSubmitTubo={manejarCrearTubo}
          formConfig={formConfig}
          onChangeConfig={(u) => setFormConfig((p) => ({ ...p, ...u }))}
          onSubmitConfig={manejarGuardarConfig}
          onCerrarTubo={manejarCerrarTubo}
          cargando={cargando}
          showConfirm={showConfirm}
        />
      ) : (
        <TabReportes produccion={produccion} tubos={tubos} />
      )}
    </div>
  );
}