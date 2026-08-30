'use client';

import { useState } from 'react';
import { Factory, FlaskConical, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useProduccionCO2, UsuarioLite, ProduccionRow, TuboRow, ConfigRow } from './hooks/useProduccionCO2';
import { TabProduccion } from './tabs/TabProduccion';
import { TabCO2 } from './tabs/TabCO2';

interface Props {
  produccionInicial: ProduccionRow[];
  tubosIniciales: TuboRow[];
  configInicial: ConfigRow[];
  usuarios: UsuarioLite[];
}

export default function ProduccionCO2Manager(props: Props) {
  const [tab, setTab] = useState<'produccion' | 'co2'>('produccion');
  const {
    produccion, tubos, cargando, banner,
    tuboActivo, estadoTubo, umbralAlerta,
    formProduccion, setFormProduccion,
    formTubo, setFormTubo,
    formConfig, setFormConfig,
    manejarCrearProduccion, manejarCrearTubo,
    manejarCerrarTubo, manejarGuardarConfig,
  } = useProduccionCO2(props);

  return (
    <div className="space-y-6">

      {/* Pestañas */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'produccion', label: 'Producción diaria', icon: <Factory className="h-3.5 w-3.5" /> },
          { key: 'co2', label: 'CO₂ y tubos', icon: <FlaskConical className="h-3.5 w-3.5" /> },
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

      {/* Banner */}
      {banner && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold border shadow-sm ${
          banner.tipo === 'ok' ? 'bg-green-50 text-green-700 border-green-200'
          : banner.tipo === 'alerta' ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {banner.tipo === 'ok' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          : banner.tipo === 'alerta' ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          : <Info className="h-4 w-4 shrink-0 mt-0.5" />}
          {banner.texto}
        </div>
      )}

      {tab === 'produccion' ? (
        <TabProduccion
          produccion={produccion}
          form={formProduccion}
          onChange={(u) => setFormProduccion((p) => ({ ...p, ...u }))}
          onSubmit={manejarCrearProduccion}
          usuarios={props.usuarios}
          cargando={cargando}
        />
      ) : (
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
        />
      )}
    </div>
  );
}