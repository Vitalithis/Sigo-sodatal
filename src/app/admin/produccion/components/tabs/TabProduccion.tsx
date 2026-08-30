import { Plus, ClipboardList } from 'lucide-react';
import { FormProduccion, ProduccionRow, UsuarioLite } from '../hooks/useProduccionCO2';

const ic = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] transition-colors';
const lc = 'block text-xs font-bold text-gray-600 mb-1';

function nombreUsuario(u?: { nombre: string; apellido: string | null } | null) {
  if (!u) return '—';
  return `${u.nombre}${u.apellido ? ` ${u.apellido}` : ''}`;
}
function formatFecha(fecha: string | Date) {
  return new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const toNum = (v: string) => v === '' ? '' : Number(v);

interface Props {
  produccion: ProduccionRow[];
  form: FormProduccion;
  onChange: (u: Partial<FormProduccion>) => void;
  onSubmit: (e: React.FormEvent) => void;
  usuarios: UsuarioLite[];
  cargando: boolean;
}

export function TabProduccion({ produccion, form, onChange, onSubmit, usuarios, cargando }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* Formulario */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#283289]" />
          <h2 className="text-sm font-bold text-gray-800">Registrar producción</h2>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className={lc}>Fecha</label>
            <input type="date" required value={form.fecha}
              onChange={(e) => onChange({ fecha: e.target.value })} className={ic} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Botellones 10L</label>
              <input type="number" min={0} value={form.botellon10_cantidad}
                onChange={(e) => onChange({ botellon10_cantidad: toNum(e.target.value) })} className={ic} />
            </div>
            <div>
              <label className={lc}>Botellones 20L</label>
              <input type="number" min={0} value={form.botellon20_cantidad}
                onChange={(e) => onChange({ botellon20_cantidad: toNum(e.target.value) })} className={ic} />
            </div>
          </div>
          <div>
            <label className={lc}>Sodas producidas</label>
            <input type="number" min={0} value={form.sodas_cantidad}
              onChange={(e) => onChange({ sodas_cantidad: toNum(e.target.value) })} className={ic} />
            <p className="text-[10px] text-gray-400 mt-1">Descuenta CO₂ del tubo activo automáticamente.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>pH</label>
              <input type="number" step="0.01" required value={form.ph}
                onChange={(e) => onChange({ ph: toNum(e.target.value) })} className={ic} />
            </div>
            <div>
              <label className={lc}>PPM</label>
              <input type="number" step="0.01" required value={form.ppm}
                onChange={(e) => onChange({ ppm: toNum(e.target.value) })} className={ic} />
            </div>
          </div>
          <div>
            <label className={lc}>Registrado por</label>
            <select required value={form.usuario_id}
              onChange={(e) => onChange({ usuario_id: e.target.value })} className={ic}>
              <option value="">Selecciona...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lc}>Observaciones</label>
            <textarea value={form.observaciones}
              onChange={(e) => onChange({ observaciones: e.target.value })}
              rows={2} className={ic} />
          </div>
          <button type="submit" disabled={cargando}
            className="w-full bg-[#283289] hover:bg-[#1e2670] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-xs">
            {cargando ? 'Guardando...' : 'Registrar producción'}
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#283289]" />
          <h2 className="text-sm font-bold text-gray-800">Histórico de producción</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70">
                <th className="px-5 py-3 font-bold">Fecha</th>
                <th className="px-3 py-3 font-bold">Bot. 10L</th>
                <th className="px-3 py-3 font-bold">Bot. 20L</th>
                <th className="px-3 py-3 font-bold">Sodas</th>
                <th className="px-3 py-3 font-bold">pH</th>
                <th className="px-3 py-3 font-bold">PPM</th>
                <th className="px-3 py-3 font-bold">Registrado por</th>
                <th className="px-3 py-3 font-bold">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {produccion.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-xs">Sin registros todavía.</td></tr>
              )}
              {produccion.map((p) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-800">{formatFecha(p.fecha)}</td>
                  <td className="px-3 py-3 text-gray-600">{p.botellon10_cantidad}</td>
                  <td className="px-3 py-3 text-gray-600">{p.botellon20_cantidad}</td>
                  <td className="px-3 py-3 text-gray-600">{p.sodas_cantidad}</td>
                  <td className="px-3 py-3 text-gray-600">{p.ph}</td>
                  <td className="px-3 py-3 text-gray-600">{p.ppm}</td>
                  <td className="px-3 py-3 text-gray-600">{nombreUsuario(p.usuario)}</td>
                  <td className="px-3 py-3 text-gray-500 max-w-[180px] truncate">{p.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}