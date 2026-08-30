import { Plus, ClipboardList, FlaskConical, Settings, AlertTriangle } from 'lucide-react';
import { TuboRow } from '../hooks/useProduccionCO2';

const ic = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] transition-colors';
const lc = 'block text-xs font-bold text-gray-600 mb-1';

function formatFecha(fecha: string | Date) {
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

interface FormTuboState { fecha_llegada: string; peso_kg: string; rendimiento_estimado: string; }
interface FormConfigState { co2_rendimiento_45kg: string; co2_rendimiento_35kg: string; co2_alerta_porcentaje: string; }
interface EstadoTubo { restante: number; porcentaje: number; color: 'red' | 'yellow' | 'green'; }

interface Props {
  tubos: TuboRow[];
  tuboActivo: TuboRow | undefined;
  estadoTubo: EstadoTubo | null;
  umbralAlerta: number;
  formTubo: FormTuboState;
  onChangeTubo: (u: Partial<FormTuboState>) => void;
  onSubmitTubo: (e: React.FormEvent) => void;
  formConfig: FormConfigState;
  onChangeConfig: (u: Partial<FormConfigState>) => void;
  onSubmitConfig: (e: React.FormEvent) => void;
  onCerrarTubo: (id: string) => void;
  cargando: boolean;
}

export function TabCO2({
  tubos, tuboActivo, estadoTubo, umbralAlerta,
  formTubo, onChangeTubo, onSubmitTubo,
  formConfig, onChangeConfig, onSubmitConfig,
  onCerrarTubo, cargando,
}: Props) {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Tubo activo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[#283289]" />
            <h2 className="text-sm font-bold text-gray-800">Tubo activo</h2>
          </div>
          <div className="p-5">
            {!tuboActivo || !estadoTubo ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay un tubo de CO₂ activo. Registra uno nuevo.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {[
                  ['Llegada', formatFecha(tuboActivo.fecha_llegada)],
                  ['Peso total', `${tuboActivo.peso_kg} kg`],
                  ['Consumido', `${tuboActivo.kg_consumidos.toFixed(1)} kg`],
                  ['Sodas producidas', String(tuboActivo.sodas_producidas_total)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="font-bold text-gray-800">{value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                    <span className="font-semibold">Restante</span>
                    <span className="font-bold">{estadoTubo.porcentaje.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        estadoTubo.color === 'red' ? 'bg-red-500'
                        : estadoTubo.color === 'yellow' ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${estadoTubo.porcentaje}%` }}
                    />
                  </div>
                  {estadoTubo.color === 'red' && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-600 font-semibold">
                        Bajo el {umbralAlerta}% de capacidad. Ten un tubo de respaldo listo.
                      </p>
                    </div>
                  )}
                </div>
                <button onClick={() => onCerrarTubo(tuboActivo.id)} disabled={cargando}
                  className="w-full mt-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-semibold py-2 rounded-xl transition-colors text-xs">
                  Cerrar tubo manualmente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nuevo tubo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#283289]" />
            <h2 className="text-sm font-bold text-gray-800">Registrar tubo nuevo</h2>
          </div>
          <form onSubmit={onSubmitTubo} className="p-5 space-y-4 text-xs">
            <div>
              <label className={lc}>Fecha de llegada</label>
              <input type="date" required value={formTubo.fecha_llegada}
                onChange={(e) => onChangeTubo({ fecha_llegada: e.target.value })} className={ic} />
            </div>
            <div>
              <label className={lc}>Peso (kg)</label>
              <select value={formTubo.peso_kg}
                onChange={(e) => onChangeTubo({ peso_kg: e.target.value })} className={ic}>
                <option value="45">45 kg</option>
                <option value="35">35 kg</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {formTubo.peso_kg === 'otro' && (
              <div>
                <label className={lc}>Peso exacto (kg)</label>
                <input type="number" min={1}
                  onChange={(e) => onChangeTubo({ peso_kg: e.target.value })} className={ic} />
              </div>
            )}
            <div>
              <label className={lc}>Rendimiento estimado (sodas) <span className="text-gray-300 font-normal">— opcional</span></label>
              <input type="number" min={1} placeholder="Se autocompleta con 45/35 kg"
                value={formTubo.rendimiento_estimado}
                onChange={(e) => onChangeTubo({ rendimiento_estimado: e.target.value })} className={ic} />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full bg-[#283289] hover:bg-[#1e2670] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
              {cargando ? 'Guardando...' : 'Registrar y activar tubo'}
            </button>
            <p className="text-[10px] text-gray-400">Al activar este tubo, cualquier otro tubo activo se cerrará automáticamente.</p>
          </form>
        </div>

        {/* Config */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#283289]" />
            <h2 className="text-sm font-bold text-gray-800">Configuración CO₂</h2>
          </div>
          <form onSubmit={onSubmitConfig} className="p-5 space-y-4 text-xs">
            <div>
              <label className={lc}>Rendimiento tubo 45kg (sodas)</label>
              <input type="number" value={formConfig.co2_rendimiento_45kg}
                onChange={(e) => onChangeConfig({ co2_rendimiento_45kg: e.target.value })} className={ic} />
            </div>
            <div>
              <label className={lc}>Rendimiento tubo 35kg (sodas)</label>
              <input type="number" value={formConfig.co2_rendimiento_35kg}
                onChange={(e) => onChangeConfig({ co2_rendimiento_35kg: e.target.value })} className={ic} />
            </div>
            <div>
              <label className={lc}>Umbral de alerta (%)</label>
              <input type="number" value={formConfig.co2_alerta_porcentaje}
                onChange={(e) => onChangeConfig({ co2_alerta_porcentaje: e.target.value })} className={ic} />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-2 rounded-xl transition-colors">
              Guardar configuración
            </button>
          </form>
        </div>
      </div>

      {/* Historial tubos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#283289]" />
          <h2 className="text-sm font-bold text-gray-800">Historial de tubos de CO₂</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70">
                <th className="px-5 py-3 font-bold">Llegada</th>
                <th className="px-3 py-3 font-bold">Peso</th>
                <th className="px-3 py-3 font-bold">Rendimiento</th>
                <th className="px-3 py-3 font-bold">Sodas producidas</th>
                <th className="px-3 py-3 font-bold">Kg consumidos</th>
                <th className="px-3 py-3 font-bold">Cierre</th>
                <th className="px-3 py-3 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tubos.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-xs">Sin tubos registrados todavía.</td></tr>
              )}
              {tubos.map((t) => (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-800">{formatFecha(t.fecha_llegada)}</td>
                  <td className="px-3 py-3 text-gray-600">{t.peso_kg} kg</td>
                  <td className="px-3 py-3 text-gray-600">{t.rendimiento_estimado}</td>
                  <td className="px-3 py-3 text-gray-600">{t.sodas_producidas_total}</td>
                  <td className="px-3 py-3 text-gray-600">{t.kg_consumidos.toFixed(1)} kg</td>
                  <td className="px-3 py-3 text-gray-600">{t.fecha_cierre ? formatFecha(t.fecha_cierre) : '—'}</td>
                  <td className="px-3 py-3">
                    {t.activo
                      ? <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-black">ACTIVO</span>
                      : <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-[10px] font-black">CERRADO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}