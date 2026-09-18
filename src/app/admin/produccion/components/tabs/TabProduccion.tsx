import { useState, useMemo } from 'react';
import { Plus, ClipboardList, ChevronLeft, ChevronRight, BarChart3, CalendarDays } from 'lucide-react';
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

// Helpers para la gestión mensual
function getMonthYear(fecha: string | Date) {
  const d = new Date(fecha);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMesLocal(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-');
  const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1));
  const text = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const maxFechaHoy = new Date().toISOString().split('T')[0];
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
  // ─────────────────────────────────────────────────────────
  // LÓGICA DE FILTRADO MENSUAL Y ESTADÍSTICAS
  // ─────────────────────────────────────────────────────────
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    produccion.forEach(p => meses.add(getMonthYear(p.fecha)));
    const mesActual = getMonthYear(new Date());
    meses.add(mesActual); // Siempre incluimos el mes actual aunque esté vacío
    return Array.from(meses).sort().reverse();
  }, [produccion]);

  const [mesSeleccionado, setMesSeleccionado] = useState(mesesDisponibles[0]);

  const produccionMes = useMemo(() => {
    return produccion.filter(p => getMonthYear(p.fecha) === mesSeleccionado);
  }, [produccion, mesSeleccionado]);

  const stats = useMemo(() => {
    let b10 = 0, b20 = 0, sodas = 0, phSum = 0, ppmSum = 0;
    produccionMes.forEach(p => {
      b10 += p.botellon10_cantidad;
      b20 += p.botellon20_cantidad;
      sodas += p.sodas_cantidad;
      phSum += p.ph;
      ppmSum += p.ppm;
    });
    const count = produccionMes.length || 1; 
    return { b10, b20, sodas, avgPh: (phSum / count).toFixed(2), avgPpm: (ppmSum / count).toFixed(2) };
  }, [produccionMes]);

  // ─────────────────────────────────────────────────────────
  // LÓGICA DE PAGINACIÓN
  // ─────────────────────────────────────────────────────────
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;
  const totalPaginas = Math.max(1, Math.ceil(produccionMes.length / ITEMS_POR_PAGINA));
  const produccionPaginada = produccionMes.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA);

  const manejarCambioMes = (mes: string) => {
    setMesSeleccionado(mes);
    setPaginaActual(1); // Reiniciamos la paginación al cambiar de mes
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

      {/* Formulario de Registro (Ajustado a su contenido con h-fit) */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit sticky top-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
          <Plus className="h-4 w-4 text-[#283289]" />
          <h2 className="text-sm font-bold text-gray-800">Registrar producción</h2>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className={lc}>Fecha</label>
            <input 
              type="date" 
              required 
              max={maxFechaHoy} 
              value={form.fecha}
              onChange={(e) => onChange({ fecha: e.target.value })} 
              className={ic} 
            />
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

      {/* Panel Derecho: Reportes y Tabla */}
      <div className="xl:col-span-3 space-y-4">
        
        {/* Cabecera de Estadísticas y Selector de Mes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#283289]" />
              <h2 className="text-base font-bold text-gray-800">Reporte Mensual</h2>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              <select 
                value={mesSeleccionado} 
                onChange={(e) => manejarCambioMes(e.target.value)}
                className="text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#283289]/20"
              >
                {mesesDisponibles.map(m => (
                  <option key={m} value={m}>{formatMesLocal(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Botellones 10L', valor: stats.b10 },
              { label: 'Botellones 20L', valor: stats.b20 },
              { label: 'Sodas', valor: stats.sodas },
              { label: 'pH Promedio', valor: produccionMes.length > 0 ? stats.avgPh : '0.00' },
              { label: 'PPM Promedio', valor: produccionMes.length > 0 ? stats.avgPpm : '0.00' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-lg font-black text-[#283289]">{stat.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla Histórica */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
            <ClipboardList className="h-4 w-4 text-[#283289]" />
            <h2 className="text-sm font-bold text-gray-800">Desglose de Producción</h2>
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
                {produccionPaginada.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-xs">Sin registros para este mes.</td></tr>
                )}
                {produccionPaginada.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-800">{formatFecha(p.fecha)}</td>
                    <td className="px-3 py-3 text-gray-600 font-medium">{p.botellon10_cantidad}</td>
                    <td className="px-3 py-3 text-gray-600 font-medium">{p.botellon20_cantidad}</td>
                    <td className="px-3 py-3 text-gray-600 font-medium">{p.sodas_cantidad}</td>
                    <td className="px-3 py-3 text-gray-600">{p.ph}</td>
                    <td className="px-3 py-3 text-gray-600">{p.ppm}</td>
                    <td className="px-3 py-3 text-gray-600">{nombreUsuario(p.usuario)}</td>
                    <td className="px-3 py-3 text-gray-500 max-w-[180px] truncate" title={p.observaciones || ''}>
                      {p.observaciones || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginación */}
          {totalPaginas > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button 
                type="button" 
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))} 
                disabled={paginaActual === 1} 
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1 text-gray-600 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button 
                type="button" 
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} 
                disabled={paginaActual === totalPaginas} 
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-1 text-gray-600 font-semibold"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}