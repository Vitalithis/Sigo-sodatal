'use client';

import React, { useMemo, useState } from 'react';
import {
  crearProduccionDiariaAction,
  obtenerProduccionAction,
  crearTuboCO2Action,
  cerrarTuboCO2Action,
  obtenerTubosCO2Action,
  actualizarConfiguracionCO2Action,
  ProduccionDiariaInput,
  TuboCO2Input,
} from '../actions';
import { Factory, FlaskConical, Plus, ClipboardList, Cylinder, Settings, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface UsuarioLite {
  id: string;
  nombre: string;
  apellido: string | null;
}

interface ProduccionRow {
  id: string;
  fecha: string | Date;
  botellon10_cantidad: number;
  botellon20_cantidad: number;
  sodas_cantidad: number;
  ph: number;
  ppm: number;
  observaciones: string | null;
  usuario?: { nombre: string; apellido: string | null } | null;
}

interface TuboRow {
  id: string;
  fecha_llegada: string | Date;
  peso_kg: number;
  rendimiento_estimado: number;
  sodas_producidas_total: number;
  kg_consumidos: number;
  fecha_cierre: string | Date | null;
  activo: boolean;
}

interface ConfigRow {
  clave: string;
  valor: string;
}

interface Props {
  produccionInicial: ProduccionRow[];
  tubosIniciales: TuboRow[];
  configInicial: ConfigRow[];
  usuarios: UsuarioLite[];
}

function formatearFecha(fecha: string | Date) {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function nombreUsuario(u?: { nombre: string; apellido: string | null } | null) {
  if (!u) return '—';
  return `${u.nombre}${u.apellido ? ` ${u.apellido}` : ''}`;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function ProduccionCO2Manager({ produccionInicial, tubosIniciales, configInicial, usuarios }: Props) {
  const [tab, setTab] = useState<'produccion' | 'co2'>('produccion');
  const [produccion, setProduccion] = useState<ProduccionRow[]>(produccionInicial);
  const [tubos, setTubos] = useState<TuboRow[]>(tubosIniciales);
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(configInicial.map((c) => [c.clave, c.valor]))
  );
  const [cargando, setCargando] = useState(false);
  const [banner, setBanner] = useState<{ tipo: 'ok' | 'alerta' | 'error'; texto: string } | null>(null);

  const [formProduccion, setFormProduccion] = useState<ProduccionDiariaInput>({
    fecha: hoyISO(),
    botellon10_cantidad: 0,
    botellon20_cantidad: 0,
    sodas_cantidad: 0,
    ph: 0,
    ppm: 0,
    observaciones: '',
    usuario_id: usuarios[0]?.id || '',
  });

  const [formTubo, setFormTubo] = useState<{ fecha_llegada: string; peso_kg: string; rendimiento_estimado: string }>({
    fecha_llegada: hoyISO(),
    peso_kg: '45',
    rendimiento_estimado: '',
  });

  const [formConfig, setFormConfig] = useState({
    co2_rendimiento_45kg: config.co2_rendimiento_45kg || '1500',
    co2_rendimiento_35kg: config.co2_rendimiento_35kg || '1167',
    co2_alerta_porcentaje: config.co2_alerta_porcentaje || '20',
  });

  const tuboActivo = useMemo(() => tubos.find((t) => t.activo), [tubos]);
  const umbralAlerta = parseFloat(config.co2_alerta_porcentaje || '20');

  const estadoTubo = useMemo(() => {
    if (!tuboActivo) return null;
    const restante = Math.max(tuboActivo.peso_kg - tuboActivo.kg_consumidos, 0);
    const porcentaje = tuboActivo.peso_kg > 0 ? Math.max(0, Math.min(100, (restante / tuboActivo.peso_kg) * 100)) : 0;
    const color = porcentaje <= umbralAlerta ? 'red' : porcentaje <= umbralAlerta * 2 ? 'yellow' : 'green';
    return { restante, porcentaje, color };
  }, [tuboActivo, umbralAlerta]);

  const refrescarProduccion = async () => {
    const res = await obtenerProduccionAction();
    if (res.success) setProduccion(res.produccion as any);
  };

  const refrescarTubos = async () => {
    const res = await obtenerTubosCO2Action();
    if (res.success) setTubos(res.tubos as any);
  };

  const manejarCrearProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduccion.usuario_id) {
      setBanner({ tipo: 'error', texto: 'Selecciona quién registra la producción.' });
      return;
    }
    setCargando(true);
    setBanner(null);
    const res = await crearProduccionDiariaAction(formProduccion);
    if (res.success) {
      setFormProduccion((prev) => ({
        ...prev,
        fecha: hoyISO(),
        botellon10_cantidad: 0,
        botellon20_cantidad: 0,
        sodas_cantidad: 0,
        ph: 0,
        ppm: 0,
        observaciones: '',
      }));
      await Promise.all([refrescarProduccion(), refrescarTubos()]);
      setBanner(
        res.alertaCO2
          ? { tipo: 'alerta', texto: `Producción registrada. ${res.alertaCO2}` }
          : { tipo: 'ok', texto: 'Producción registrada correctamente.' }
      );
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo registrar la producción.' });
    }
    setCargando(false);
  };

  const manejarCrearTubo = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesoNum = parseFloat(formTubo.peso_kg);
    if (!pesoNum || pesoNum <= 0) {
      setBanner({ tipo: 'error', texto: 'Indica un peso válido para el tubo.' });
      return;
    }
    const payload: TuboCO2Input = {
      fecha_llegada: formTubo.fecha_llegada,
      peso_kg: pesoNum,
      rendimiento_estimado: formTubo.rendimiento_estimado ? parseInt(formTubo.rendimiento_estimado, 10) : undefined,
    };
    setCargando(true);
    setBanner(null);
    const res = await crearTuboCO2Action(payload);
    if (res.success) {
      setFormTubo({ fecha_llegada: hoyISO(), peso_kg: '45', rendimiento_estimado: '' });
      await refrescarTubos();
      setBanner({ tipo: 'ok', texto: 'Tubo de CO₂ registrado y activado.' });
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo registrar el tubo.' });
    }
    setCargando(false);
  };

  const manejarCerrarTubo = async (tuboId: string) => {
    if (!confirm('¿Cerrar este tubo de CO₂ manualmente? Ya no se usará para calcular consumo.')) return;
    setCargando(true);
    const res = await cerrarTuboCO2Action(tuboId);
    if (res.success) {
      await refrescarTubos();
      setBanner({ tipo: 'ok', texto: 'Tubo cerrado.' });
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo cerrar el tubo.' });
    }
    setCargando(false);
  };

  const manejarGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    const res = await actualizarConfiguracionCO2Action({
      co2_rendimiento_45kg: parseInt(formConfig.co2_rendimiento_45kg, 10),
      co2_rendimiento_35kg: parseInt(formConfig.co2_rendimiento_35kg, 10),
      co2_alerta_porcentaje: parseFloat(formConfig.co2_alerta_porcentaje),
    });
    if (res.success) {
      setConfig({
        co2_rendimiento_45kg: formConfig.co2_rendimiento_45kg,
        co2_rendimiento_35kg: formConfig.co2_rendimiento_35kg,
        co2_alerta_porcentaje: formConfig.co2_alerta_porcentaje,
      });
      setBanner({ tipo: 'ok', texto: 'Configuración de CO₂ actualizada.' });
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo actualizar la configuración.' });
    }
    setCargando(false);
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] transition-colors";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1";

  return (
    <div className="space-y-6">

      {/* Pestañas */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('produccion')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
            tab === 'produccion'
              ? 'border-[#283289] text-[#283289] bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Factory className="h-3.5 w-3.5" />
          Producción diaria
        </button>
        <button
          onClick={() => setTab('co2')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
            tab === 'co2'
              ? 'border-[#283289] text-[#283289] bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          CO₂ y tubos
        </button>
      </div>

      {/* Banner de estado */}
      {banner && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold border shadow-sm ${
          banner.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border-green-200'
            : banner.tipo === 'alerta'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {banner.tipo === 'ok'
            ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            : banner.tipo === 'alerta'
            ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            : <Info className="h-4 w-4 shrink-0 mt-0.5" />}
          {banner.texto}
        </div>
      )}

      {tab === 'produccion' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Formulario nueva producción */}
          <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#283289]" />
              <h2 className="text-sm font-bold text-gray-800">Registrar producción</h2>
            </div>
            <form onSubmit={manejarCrearProduccion} className="p-5 space-y-4 text-xs">
              <div>
                <label className={labelClass}>Fecha</label>
                <input
                  type="date"
                  required
                  value={formProduccion.fecha}
                  onChange={(e) => setFormProduccion((p) => ({ ...p, fecha: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Botellones 10L</label>
                  <input
                    type="number"
                    min={0}
                    value={formProduccion.botellon10_cantidad}
                    onChange={(e) => setFormProduccion((p) => ({ ...p, botellon10_cantidad: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Botellones 20L</label>
                  <input
                    type="number"
                    min={0}
                    value={formProduccion.botellon20_cantidad}
                    onChange={(e) => setFormProduccion((p) => ({ ...p, botellon20_cantidad: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Sodas producidas</label>
                <input
                  type="number"
                  min={0}
                  value={formProduccion.sodas_cantidad}
                  onChange={(e) => setFormProduccion((p) => ({ ...p, sodas_cantidad: Number(e.target.value) }))}
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-400 mt-1">Descuenta CO₂ del tubo activo automáticamente.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>pH</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formProduccion.ph || ''}
                    onChange={(e) => setFormProduccion((p) => ({ ...p, ph: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>PPM</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formProduccion.ppm || ''}
                    onChange={(e) => setFormProduccion((p) => ({ ...p, ppm: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Registrado por</label>
                <select
                  required
                  value={formProduccion.usuario_id}
                  onChange={(e) => setFormProduccion((p) => ({ ...p, usuario_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Selecciona...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {nombreUsuario(u)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Observaciones</label>
                <textarea
                  value={formProduccion.observaciones}
                  onChange={(e) => setFormProduccion((p) => ({ ...p, observaciones: e.target.value }))}
                  rows={2}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#283289] hover:bg-[#1e2670] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-xs"
              >
                {cargando ? 'Guardando...' : 'Registrar producción'}
              </button>
            </form>
          </div>

          {/* Histórico de producción */}
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
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400 text-xs">
                        Sin registros de producción todavía.
                      </td>
                    </tr>
                  )}
                  {produccion.map((p) => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800">{formatearFecha(p.fecha)}</td>
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

      ) : (
        <div className="space-y-6">

          {/* Fila superior: tubo activo, nuevo tubo y configuración */}
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
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 font-medium">Llegada</span>
                      <span className="font-bold text-gray-800">{formatearFecha(tuboActivo.fecha_llegada)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 font-medium">Peso total</span>
                      <span className="font-bold text-gray-800">{tuboActivo.peso_kg} kg</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 font-medium">Consumido</span>
                      <span className="font-bold text-gray-800">{tuboActivo.kg_consumidos.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 font-medium">Sodas producidas</span>
                      <span className="font-bold text-gray-800">{tuboActivo.sodas_producidas_total}</span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                        <span className="font-semibold">Restante</span>
                        <span className="font-bold">{estadoTubo.porcentaje.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            estadoTubo.color === 'red'
                              ? 'bg-red-500'
                              : estadoTubo.color === 'yellow'
                              ? 'bg-amber-400'
                              : 'bg-green-500'
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

                    <button
                      onClick={() => manejarCerrarTubo(tuboActivo.id)}
                      disabled={cargando}
                      className="w-full mt-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-semibold py-2 rounded-xl transition-colors text-xs"
                    >
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
              <form onSubmit={manejarCrearTubo} className="p-5 space-y-4 text-xs">
                <div>
                  <label className={labelClass}>Fecha de llegada</label>
                  <input
                    type="date"
                    required
                    value={formTubo.fecha_llegada}
                    onChange={(e) => setFormTubo((p) => ({ ...p, fecha_llegada: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Peso (kg)</label>
                  <select
                    value={formTubo.peso_kg}
                    onChange={(e) => setFormTubo((p) => ({ ...p, peso_kg: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="45">45 kg</option>
                    <option value="35">35 kg</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                {formTubo.peso_kg === 'otro' && (
                  <div>
                    <label className={labelClass}>Peso exacto (kg)</label>
                    <input
                      type="number"
                      min={1}
                      onChange={(e) => setFormTubo((p) => ({ ...p, peso_kg: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>
                    Rendimiento estimado (sodas){' '}
                    <span className="text-gray-300 font-normal">— opcional</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Se autocompleta con 45/35 kg"
                    value={formTubo.rendimiento_estimado}
                    onChange={(e) => setFormTubo((p) => ({ ...p, rendimiento_estimado: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-[#283289] hover:bg-[#1e2670] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
                >
                  {cargando ? 'Guardando...' : 'Registrar y activar tubo'}
                </button>
                <p className="text-[10px] text-gray-400">
                  Al activar este tubo, cualquier otro tubo activo se cerrará automáticamente.
                </p>
              </form>
            </div>

            {/* Configuración */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#283289]" />
                <h2 className="text-sm font-bold text-gray-800">Configuración CO₂</h2>
              </div>
              <form onSubmit={manejarGuardarConfig} className="p-5 space-y-4 text-xs">
                <div>
                  <label className={labelClass}>Rendimiento tubo 45kg (sodas)</label>
                  <input
                    type="number"
                    value={formConfig.co2_rendimiento_45kg}
                    onChange={(e) => setFormConfig((p) => ({ ...p, co2_rendimiento_45kg: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rendimiento tubo 35kg (sodas)</label>
                  <input
                    type="number"
                    value={formConfig.co2_rendimiento_35kg}
                    onChange={(e) => setFormConfig((p) => ({ ...p, co2_rendimiento_35kg: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Umbral de alerta (%)</label>
                  <input
                    type="number"
                    value={formConfig.co2_alerta_porcentaje}
                    onChange={(e) => setFormConfig((p) => ({ ...p, co2_alerta_porcentaje: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-2 rounded-xl transition-colors"
                >
                  Guardar configuración
                </button>
              </form>
            </div>
          </div>

          {/* Historial de tubos */}
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
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-400 text-xs">
                        Sin tubos registrados todavía.
                      </td>
                    </tr>
                  )}
                  {tubos.map((t) => (
                    <tr key={t.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800">{formatearFecha(t.fecha_llegada)}</td>
                      <td className="px-3 py-3 text-gray-600">{t.peso_kg} kg</td>
                      <td className="px-3 py-3 text-gray-600">{t.rendimiento_estimado}</td>
                      <td className="px-3 py-3 text-gray-600">{t.sodas_producidas_total}</td>
                      <td className="px-3 py-3 text-gray-600">{t.kg_consumidos.toFixed(1)} kg</td>
                      <td className="px-3 py-3 text-gray-600">{t.fecha_cierre ? formatearFecha(t.fecha_cierre) : '—'}</td>
                      <td className="px-3 py-3">
                        {t.activo ? (
                          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-black">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-[10px] font-black">
                            CERRADO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}