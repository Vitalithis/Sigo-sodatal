import { useMemo, useState } from 'react';
import {
  crearProduccionDiariaAction,
  obtenerProduccionAction,
  crearTuboCO2Action,
  cerrarTuboCO2Action,
  obtenerTubosCO2Action,
  actualizarConfiguracionCO2Action,
  TuboCO2Input,
} from '../../actions';

export interface ProduccionRow {
  id: string; fecha: string | Date;
  botellon10_cantidad: number; botellon20_cantidad: number;
  sodas_cantidad: number; ph: number; ppm: number;
  observaciones: string | null;
  usuario?: { nombre: string; apellido: string | null } | null;
}
export interface TuboRow {
  id: string; fecha_llegada: string | Date; peso_kg: number;
  rendimiento_estimado: number; sodas_producidas_total: number;
  kg_consumidos: number; fecha_cierre: string | Date | null; activo: boolean;
}
export interface UsuarioLite { id: string; nombre: string; apellido: string | null; }
export interface ConfigRow { clave: string; valor: string; }
export interface BannerState { tipo: 'ok' | 'alerta' | 'error'; texto: string; }

export type FormProduccion = {
  fecha: string;
  botellon10_cantidad: number | '';
  botellon20_cantidad: number | '';
  sodas_cantidad: number | '';
  ph: number | '';
  ppm: number | '';
  observaciones: string;
  usuario_id: string;
};

interface InitialData {
  produccionInicial: ProduccionRow[];
  tubosIniciales: TuboRow[];
  configInicial: ConfigRow[];
  usuarios: UsuarioLite[];
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

const FORM_VACIO: Omit<FormProduccion, 'usuario_id'> = {
  fecha: hoyISO(),
  botellon10_cantidad: '',
  botellon20_cantidad: '',
  sodas_cantidad: '',
  ph: '',
  ppm: '',
  observaciones: '',
};

export function useProduccionCO2({ produccionInicial, tubosIniciales, configInicial, usuarios }: InitialData) {
  const [produccion, setProduccion] = useState<ProduccionRow[]>(produccionInicial);
  const [tubos, setTubos] = useState<TuboRow[]>(tubosIniciales);
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(configInicial.map((c) => [c.clave, c.valor]))
  );
  const [cargando, setCargando] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const [formProduccion, setFormProduccion] = useState<FormProduccion>({
    ...FORM_VACIO,
    usuario_id: usuarios[0]?.id || '',
  });

  const [formTubo, setFormTubo] = useState({
    fecha_llegada: hoyISO(), peso_kg: '45', rendimiento_estimado: '',
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
    const porcentaje = tuboActivo.peso_kg > 0
      ? Math.max(0, Math.min(100, (restante / tuboActivo.peso_kg) * 100)) : 0;
    const color = porcentaje <= umbralAlerta ? 'red'
      : porcentaje <= umbralAlerta * 2 ? 'yellow' : 'green';
    return { restante, porcentaje, color } as const;
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
    setCargando(true); setBanner(null);
    const res = await crearProduccionDiariaAction({
      ...formProduccion,
      botellon10_cantidad: Number(formProduccion.botellon10_cantidad) || 0,
      botellon20_cantidad: Number(formProduccion.botellon20_cantidad) || 0,
      sodas_cantidad: Number(formProduccion.sodas_cantidad) || 0,
      ph: Number(formProduccion.ph) || 0,
      ppm: Number(formProduccion.ppm) || 0,
    });
    if (res.success) {
      setFormProduccion((p) => ({ ...FORM_VACIO, fecha: hoyISO(), usuario_id: p.usuario_id }));
      await Promise.all([refrescarProduccion(), refrescarTubos()]);
      setBanner(res.alertaCO2
        ? { tipo: 'alerta', texto: `Producción registrada. ${res.alertaCO2}` }
        : { tipo: 'ok', texto: 'Producción registrada correctamente.' });
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo registrar la producción.' });
    }
    setCargando(false);
  };

  const manejarCrearTubo = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesoNum = parseFloat(formTubo.peso_kg);
    if (!pesoNum || pesoNum <= 0) {
      setBanner({ tipo: 'error', texto: 'Indica un peso válido para el tubo.' }); return;
    }
    const payload: TuboCO2Input = {
      fecha_llegada: formTubo.fecha_llegada, peso_kg: pesoNum,
      rendimiento_estimado: formTubo.rendimiento_estimado
        ? parseInt(formTubo.rendimiento_estimado, 10) : undefined,
    };
    setCargando(true); setBanner(null);
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
    if (res.success) { await refrescarTubos(); setBanner({ tipo: 'ok', texto: 'Tubo cerrado.' }); }
    else setBanner({ tipo: 'error', texto: res.message || 'No se pudo cerrar el tubo.' });
    setCargando(false);
  };

  const manejarGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true);
    const res = await actualizarConfiguracionCO2Action({
      co2_rendimiento_45kg: parseInt(formConfig.co2_rendimiento_45kg, 10),
      co2_rendimiento_35kg: parseInt(formConfig.co2_rendimiento_35kg, 10),
      co2_alerta_porcentaje: parseFloat(formConfig.co2_alerta_porcentaje),
    });
    if (res.success) {
      setConfig({ ...formConfig });
      setBanner({ tipo: 'ok', texto: 'Configuración de CO₂ actualizada.' });
    } else {
      setBanner({ tipo: 'error', texto: res.message || 'No se pudo actualizar la configuración.' });
    }
    setCargando(false);
  };

  return {
    produccion, tubos, cargando, banner,
    tuboActivo, estadoTubo, umbralAlerta,
    formProduccion, setFormProduccion,
    formTubo, setFormTubo,
    formConfig, setFormConfig,
    manejarCrearProduccion, manejarCrearTubo,
    manejarCerrarTubo, manejarGuardarConfig,
  };
}