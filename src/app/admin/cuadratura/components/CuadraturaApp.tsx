'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Unlock, 
  AlertCircle, 
  X, 
  Check, 
  Search, 
  Eye, 
  ClipboardList, 
  DollarSign, 
  Truck, 
  Fuel, 
  Package, 
  ArrowRight, 
  Gauge, 
  AlertTriangle, 
  RefreshCw, 
  CheckCheck,
  Zap,
  Info,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
  Copy,
  Moon,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  registrarSalidaAction,
  registrarCierreCuadraturaAction,
  registrarCambioDeVueltaAction,
  reabrirCuadraturaAction,
  obtenerDatosSalidaRepartidorAction,
  obtenerResumenRutaRepartidorAction,
  cerrarJornadaCuadraturasAction,
} from '../actions';
import { getHoyHabilStr, handleDateInputSoloHabiles } from '@/lib/fechas';

interface Repartidor {
  id: string;
  nombre: string;
  apellido: string | null;
  recibe_comision: boolean;
  vehiculo?: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    kilometraje_actual: number;
  } | null;
}

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio_venta_nueva: number;
  precio_recarga: number | null;
}

interface CuadraturaAppProps {
  repartidores: Repartidor[];
  productos: Producto[];
  historial: any[];
}

type PanelModal = 'salida' | 'cierre' | 'nueva_vuelta' | 'reabrir' | 'detalle' | null;

export default function CuadraturaApp({ repartidores, productos, historial }: CuadraturaAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panel, setPanel] = useState<PanelModal>(null);
  
  const [cuadraturaSeleccionada, setCuadraturaSeleccionada] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoDatosRuta, setCargandoDatosRuta] = useState(false);

  const maxDate = getHoyHabilStr();

  // ── Salida
  const [salidaRep, setSalidaRep] = useState('');
  const [salidaFecha, setSalidaFecha] = useState(maxDate);
  const [salidaItems, setSalidaItems] = useState<Record<string, string | number>>({});
  const [salidaKmInicial, setSalidaKmInicial] = useState<string | number>('');
  const [datosSalidaPrevios, setDatosSalidaPrevios] = useState<any>(null);
  const [salidaOtros, setSalidaOtros] = useState('');
  const [salidaEsNuevaVuelta, setSalidaEsNuevaVuelta] = useState(false);
  const [salidaNumeroVuelta, setSalidaNumeroVuelta] = useState<number>(1);
  const [detalleTabVuelta, setDetalleTabVuelta] = useState<'consolidado' | number>('consolidado');
  
  // ── Combustible
  const [incluirCombustible, setIncluirCombustible] = useState(false);
  const [combTipo, setCombTipo] = useState('DIESEL');
  const [combMonto, setCombMonto] = useState<string | number>('');
  const [combLitros, setCombLitros] = useState<string | number>('');
  const [combNumFactura, setCombNumFactura] = useState('');
  const [combRutaFactura, setCombRutaFactura] = useState('');

  // ── Cierre / Recepción
  const [resumenRutaCierre, setResumenRutaCierre] = useState<any>(null);
  const [cierreRetorno, setCierreRetorno] = useState<Record<string, string | number>>({});
  const [cierreVaciosTot, setCierreVaciosTot] = useState<string | number>('');
  const [cierreVaciosDan, setCierreVaciosDan] = useState<string | number>('');
  const [cierreDanadosDetalle, setCierreDanadosDetalle] = useState<Record<string, string | number>>({});
  const [cierreKmFinal, setCierreKmFinal] = useState<string | number>('');
  const [cierreEfectivo, setCierreEfectivo] = useState<string | number>('');
  const [cierreTarjeta, setCierreTarjeta] = useState<string | number>('');
  const [cierreTransferencia, setCierreTransferencia] = useState<string | number>('');
  const [cierreOtros, setCierreOtros] = useState('');
  const [cierreCombustible, setCierreCombustible] = useState({
    habilitar: false,
    tipo: 'DIESEL',
    monto: '',
    litros: '',
    factura: ''
  });

  // ── Reapertura
  const [reabrirMotivo, setReobrirMotivo] = useState('');

  // ── Nueva Vuelta (Descarga Vuelta N + Carga Vuelta N+1)
  const [nvVueltaTermina, setNvVueltaTermina] = useState<number>(1);
  const [nvVueltaEmpieza, setNvVueltaEmpieza] = useState<number>(2);
  const [nvKmSalidaAnterior, setNvKmSalidaAnterior] = useState<number>(0);
  const [nvKmFinal, setNvKmFinal] = useState<string | number>('');
  const [nvRetornoLlenos, setNvRetornoLlenos] = useState<Record<string, string | number>>({});
  const [nvVaciosTot, setNvVaciosTot] = useState<string | number>('');
  const [nvVaciosDan, setNvVaciosDan] = useState<string | number>('');
  const [nvDanadosDetalle, setNvDanadosDetalle] = useState<Record<string, string | number>>({});
  const [nvEfectivo, setNvEfectivo] = useState<string | number>('');
  const [nvOtrosRetorno, setNvOtrosRetorno] = useState('');
  const [nvItemsSalida, setNvItemsSalida] = useState<Record<string, string | number>>({});
  const [nvOtrosSalida, setNvOtrosSalida] = useState('');
  const [nvCombustible, setNvCombustible] = useState({
    habilitar: false,
    tipo: 'DIESEL',
    monto: '',
    litros: '',
    factura: ''
  });
  const [nvResumenRuta, setNvResumenRuta] = useState<any>(null);

  const nvTotalDanados = useMemo(() => {
    return Object.values(nvDanadosDetalle).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
  }, [nvDanadosDetalle]);

  const totalDanados = useMemo(() => {
    return Object.values(cierreDanadosDetalle).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
  }, [cierreDanadosDetalle]);

  const showNotif = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // ¿Es la primera salida del día para este repartidor?
  const esPrimeraSalida = !historial.some(c => 
    c.usuario_id === salidaRep && 
    new Date(c.fecha).toISOString().split('T')[0] === salidaFecha &&
    c.estado === 'ABIERTA'
  );

  // Iniciar una nueva vuelta para un chofer existente hoy (Descarga de vuelta que llega + Carga de nueva vuelta)
  const handleAbrirNuevaVuelta = (c: any) => {
    setCuadraturaSeleccionada(c);
    const vActiva = c.vuelta_activa?.numero_vuelta;
    const vUltima = (c.vueltas && c.vueltas.length > 0) ? c.vueltas[c.vueltas.length - 1].numero_vuelta : 1;
    const numTermina = vActiva || vUltima || 1;
    const numEmpieza = (c.total_vueltas || (c.vueltas?.length ?? 1)) + 1;

    setNvVueltaTermina(numTermina);
    setNvVueltaEmpieza(numEmpieza);

    const vObj = c.vueltas?.find((v: any) => v.numero_vuelta === numTermina);
    setNvKmSalidaAnterior(vObj?.km_salida || c.km_inicial || 0);

    // Limpiar descarga
    setNvRetornoLlenos({});
    setNvVaciosTot('');
    setNvVaciosDan('');
    setNvDanadosDetalle({});
    setNvEfectivo('');
    setNvOtrosRetorno('');

    // Limpiar carga
    setNvItemsSalida({});
    setNvOtrosSalida('');
    setNvCombustible({ habilitar: false, tipo: 'DIESEL', monto: '', litros: '', factura: '' });

    // Prellenar odómetro sugerido
    const kmSugerido = c.vehiculo?.kilometraje_actual || c.km_final || vObj?.km_salida || c.km_inicial || '';
    setNvKmFinal(kmSugerido);

    // Cargar entregas de la ruta si está abierta
    const fechaStr = new Date(c.fecha).toISOString().split('T')[0];
    obtenerResumenRutaRepartidorAction(c.usuario_id, fechaStr).then(res => {
      if (res.success) {
        setNvResumenRuta(res);
        if (res.cantidades_ruta?.vacios_esperados !== undefined) {
          setNvVaciosTot(res.cantidades_ruta.vacios_esperados);
        }
        if (res.financiero_ruta?.total_efectivo !== undefined) {
          setNvEfectivo(res.financiero_ruta.total_efectivo);
        }
        if (res.vehiculo?.kilometraje_actual) {
          setNvKmFinal(res.vehiculo.kilometraje_actual);
        }
        if (res.accesorios?.retorno) {
          setNvOtrosRetorno(res.accesorios.retorno);
        }
      }
    });

    setPanel('nueva_vuelta');
  };

  const handleCambioDeVuelta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadraturaSeleccionada) return showNotif('error', 'Selecciona la cuadratura.');
    if (!nvKmFinal || Number(nvKmFinal) <= 0) {
      return showNotif('error', 'El kilometraje de llegada es obligatorio.');
    }
    const kmIni = cuadraturaSeleccionada.km_inicial || 0;
    if (Number(nvKmFinal) < kmIni) {
      return showNotif('error', `El kilometraje de llegada (${nvKmFinal} km) no puede ser menor al inicial (${kmIni} km).`);
    }

    const itemsCarga = Object.entries(nvItemsSalida)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);

    if (itemsCarga.length === 0) {
      return showNotif('error', 'Debes cargar al menos un producto para la nueva vuelta.');
    }

    const retornoLlenos = Object.entries(nvRetornoLlenos)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);

    let combPayload = null;
    if (nvCombustible.habilitar && Number(nvCombustible.monto) > 0) {
      combPayload = {
        tipo_combustible: nvCombustible.tipo,
        monto: Number(nvCombustible.monto),
        litros: nvCombustible.litros ? Number(nvCombustible.litros) : undefined,
        numero_factura: nvCombustible.factura,
      };
    }

    const danadosDetalleNumerico: Record<string, number> = {};
    let totalDanadosCalculado = 0;
    for (const [prodId, val] of Object.entries(nvDanadosDetalle)) {
      const c = Number(val) || 0;
      if (c > 0) {
        danadosDetalleNumerico[prodId] = c;
        totalDanadosCalculado += c;
      }
    }
    const cantidadDanadosFinal = totalDanadosCalculado > 0 ? totalDanadosCalculado : (Number(nvVaciosDan) || 0);

    startTransition(async () => {
      const res = await registrarCambioDeVueltaAction({
        cuadratura_id: cuadraturaSeleccionada.id,
        numero_vuelta_actual: nvVueltaTermina,
        numero_nueva_vuelta: nvVueltaEmpieza,
        km_llegada: Number(nvKmFinal),
        retorno_llenos: retornoLlenos,
        botellones_vacios: {
          cantidad_total: Number(nvVaciosTot) || 0,
          cantidad_danados: cantidadDanadosFinal,
          danados_detalle: danadosDetalleNumerico,
        },
        efectivo_rendido: undefined,
        otros_retorno: nvOtrosRetorno.trim() || undefined,
        items_salida: itemsCarga,
        otros_salida: nvOtrosSalida.trim() || undefined,
        combustible: combPayload,
      });

      if (res.success) {
        showNotif('success', `Vuelta ${nvVueltaTermina} recepcionada y Vuelta ${nvVueltaEmpieza} despachada con éxito.`);
        if (res.alertas && res.alertas.length > 0) {
          res.alertas.forEach(a => setTimeout(() => showNotif('warning', a), 1500));
        }
        setPanel(null);
        setCuadraturaSeleccionada(null);
        setNvResumenRuta(null);
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al procesar el cambio de vuelta.');
      }
    });
  };

  // Cargar datos previos cuando se selecciona repartidor y fecha en Salida
  useEffect(() => {
    if (panel === 'salida' && salidaRep && salidaFecha) {
      obtenerDatosSalidaRepartidorAction(salidaRep, salidaFecha).then(res => {
        if (res.success) {
          setDatosSalidaPrevios(res);
          if (res.km_sugerido && (!salidaKmInicial || Number(salidaKmInicial) === 0)) {
            setSalidaKmInicial(res.km_sugerido);
          }
          if (res.otros_accesorios && !salidaOtros) {
            setSalidaOtros(res.otros_accesorios);
          }
          if (res.proxima_vuelta && res.proxima_vuelta > 1 && !salidaEsNuevaVuelta) {
            setSalidaNumeroVuelta(res.proxima_vuelta);
            setSalidaEsNuevaVuelta(true);
          }
        }
      });
    }
  }, [panel, salidaRep, salidaFecha, salidaEsNuevaVuelta, salidaKmInicial, salidaOtros]);

  // Cargar resumen de ruta y entregas cuando se abre modal de Cierre / Recepción
  useEffect(() => {
    if (panel === 'cierre' && cuadraturaSeleccionada) {
      setCargandoDatosRuta(true);
      const fechaStr = new Date(cuadraturaSeleccionada.fecha).toISOString().split('T')[0];
      obtenerResumenRutaRepartidorAction(cuadraturaSeleccionada.usuario_id, fechaStr).then(res => {
        setCargandoDatosRuta(false);
        if (res.success) {
          setResumenRutaCierre(res);

          // Prellenar vacíos esperados
          if (res.cantidades_ruta?.vacios_esperados !== undefined) {
            setCierreVaciosTot(res.cantidades_ruta.vacios_esperados);
          }
          // Prellenar medios de pago calculados de entregas
          if (res.financiero_ruta?.total_efectivo !== undefined) {
            setCierreEfectivo(res.financiero_ruta.total_efectivo);
          }
          if (res.financiero_ruta?.total_tarjeta !== undefined) {
            setCierreTarjeta(res.financiero_ruta.total_tarjeta);
          }
          if (res.financiero_ruta?.total_transferencia !== undefined) {
            setCierreTransferencia(res.financiero_ruta.total_transferencia);
          }
          // Sugerir odómetro si existe
          if (res.vehiculo?.kilometraje_actual) {
            setCierreKmFinal(res.vehiculo.kilometraje_actual);
          }
          // Prellenar accesorios de retorno si existían
          if (res.accesorios?.retorno) {
            setCierreOtros(res.accesorios.retorno);
          }
        }
      });
    }
  }, [panel, cuadraturaSeleccionada]);

  // Pre-llenar cantidades de salida según la expectativa de la ruta
  const handleCargarSegunRuta = () => {
    if (!datosSalidaPrevios?.expectativa_ruta) return;
    const exp = datosSalidaPrevios.expectativa_ruta;
    const nuevoItems: Record<string, number> = {};

    productos.forEach(p => {
      if (p.categoria === 'BOTELLON20' && exp.bot20 > 0) nuevoItems[p.id] = exp.bot20;
      if (p.categoria === 'BOTELLON10' && exp.bot10 > 0) nuevoItems[p.id] = exp.bot10;
      if (p.categoria === 'SODA' && exp.soda > 0) nuevoItems[p.id] = exp.soda;
    });

    setSalidaItems(prev => ({ ...prev, ...nuevoItems }));
    showNotif('success', `Cantidades cargadas automáticamente desde la ruta programada.`);
  };

  const handleSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaRep) return showNotif('error', 'Selecciona un repartidor.');
    
    if ((esPrimeraSalida || salidaEsNuevaVuelta) && (!salidaKmInicial || Number(salidaKmInicial) <= 0)) {
      return showNotif('error', 'El kilometraje inicial es obligatorio al despachar el camión.');
    }

    let combustiblePayload = null;
    if (incluirCombustible) {
      if (!combMonto || Number(combMonto) <= 0) {
        return showNotif('error', 'Debes ingresar el monto del combustible.');
      }
      combustiblePayload = {
        tipo_combustible: combTipo,
        monto: Number(combMonto),
        litros: combLitros ? Number(combLitros) : undefined,
        numero_factura: combNumFactura,
        ruta_factura: combRutaFactura
      };
    }

    const items = Object.entries(salidaItems)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);
      
    if (items.length === 0) return showNotif('error', 'Debes cargar al menos un producto.');

    startTransition(async () => {
      const payload = { 
        usuario_id: salidaRep, 
        fecha: salidaFecha, 
        items,
        km_inicial: (esPrimeraSalida || salidaEsNuevaVuelta) ? Number(salidaKmInicial) : undefined,
        combustible: combustiblePayload,
        otros_accesorios: salidaOtros.trim() || undefined,
        es_nueva_vuelta: salidaEsNuevaVuelta,
        numero_vuelta: salidaNumeroVuelta
      };

      const res = await registrarSalidaAction(payload);
      if (res.success) {
        showNotif('success', `Carga registrada y Vuelta ${salidaNumeroVuelta} despachada exitosamente.`);
        setPanel(null);
        setSalidaItems({});
        setSalidaKmInicial('');
        setSalidaOtros('');
        setSalidaEsNuevaVuelta(false);
        setSalidaNumeroVuelta(1);
        setIncluirCombustible(false);
        setCombMonto('');
        setCombLitros('');
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al registrar salida.');
      }
    });
  };

  const handleCierre = async (e: React.FormEvent, accion: 'cerrar' | 'nueva_vuelta' = 'cerrar') => {
    e.preventDefault();
    if (!cuadraturaSeleccionada) return showNotif('error', 'Selecciona la ruta a recepcionar.');
    if (!cierreKmFinal || Number(cierreKmFinal) <= 0) return showNotif('error', 'El kilometraje final es obligatorio.');

    const kmIni = cuadraturaSeleccionada.km_inicial || 0;
    if (Number(cierreKmFinal) < kmIni) {
      return showNotif('error', `El kilometraje final (${cierreKmFinal} km) no puede ser inferior al inicial (${kmIni} km).`);
    }

    const retornoItems = Object.entries(cierreRetorno)
      .map(([producto_id, val]) => ({ producto_id, cantidad: Number(val) || 0 }))
      .filter(item => item.cantidad > 0);

    let combPayload = null;
    if (cierreCombustible.habilitar && Number(cierreCombustible.monto) > 0) {
      combPayload = {
        tipo_combustible: cierreCombustible.tipo,
        monto: Number(cierreCombustible.monto),
        litros: cierreCombustible.litros ? Number(cierreCombustible.litros) : undefined,
        numero_factura: cierreCombustible.factura,
      };
    }

    const danadosDetalleNumerico: Record<string, number> = {};
    let totalDanadosCalculado = 0;
    for (const [prodId, val] of Object.entries(cierreDanadosDetalle)) {
      const c = Number(val) || 0;
      if (c > 0) {
        danadosDetalleNumerico[prodId] = c;
        totalDanadosCalculado += c;
      }
    }
    const cantidadDanadosFinal = totalDanadosCalculado > 0 ? totalDanadosCalculado : (Number(cierreVaciosDan) || 0);

    const mantenerAbierta = accion === 'nueva_vuelta';
    const numVueltaActual = resumenRutaCierre?.vuelta_activa?.numero_vuelta || cuadraturaSeleccionada.vuelta_activa?.numero_vuelta || cuadraturaSeleccionada.total_vueltas || 1;

    startTransition(async () => {
      const res = await registrarCierreCuadraturaAction({
        cuadratura_id: cuadraturaSeleccionada.id,
        retorno: retornoItems,
        botellones_vacios: { 
          cantidad_total: Number(cierreVaciosTot) || 0, 
          cantidad_danados: cantidadDanadosFinal,
          danados_detalle: danadosDetalleNumerico,
        },
        combustible: combPayload,
        km_final: Number(cierreKmFinal),
        total_efectivo: cierreEfectivo !== '' ? Number(cierreEfectivo) : undefined,
        total_tarjeta: cierreTarjeta !== '' ? Number(cierreTarjeta) : undefined,
        total_transferencia: cierreTransferencia !== '' ? Number(cierreTransferencia) : undefined,
        otros_retorno: cierreOtros.trim() || undefined,
        mantener_abierta: mantenerAbierta,
        numero_vuelta: numVueltaActual,
        permitir_ajuste: true,
      });

      if (res.success) {
        if (mantenerAbierta) {
          showNotif('success', `Vuelta ${numVueltaActual} recepcionada. Despachando la siguiente vuelta...`);
          const sigVuelta = numVueltaActual + 1;
          const choferId = cuadraturaSeleccionada.usuario_id;
          const fechaStr = new Date(cuadraturaSeleccionada.fecha).toISOString().split('T')[0];
          const kmLlegada = Number(cierreKmFinal);

          // Limpiar cierre
          setCierreRetorno({});
          setCierreVaciosTot('');
          setCierreVaciosDan('');
          setCierreDanadosDetalle({});
          setCierreKmFinal('');
          setCierreEfectivo('');
          setCierreTarjeta('');
          setCierreTransferencia('');
          setCierreOtros('');
          setResumenRutaCierre(null);

          // Configurar Salida para Vuelta N+1
          setSalidaRep(choferId);
          setSalidaFecha(fechaStr);
          setSalidaEsNuevaVuelta(true);
          setSalidaNumeroVuelta(sigVuelta);
          setSalidaKmInicial(kmLlegada);
          setSalidaItems({});
          setSalidaOtros('');
          setIncluirCombustible(false);
          setCombMonto('');
          setCombLitros('');
          setPanel('salida');
        } else {
          showNotif('success', 'Recepción finalizada y Cuadratura cerrada exitosamente.');
          if (res.alertas && res.alertas.length > 0) {
            res.alertas.forEach(a => setTimeout(() => showNotif('warning', a), 1500));
          }
          setPanel(null);
          setCierreRetorno({});
          setCierreVaciosTot('');
          setCierreVaciosDan('');
          setCierreDanadosDetalle({});
          setCierreKmFinal('');
          setCierreEfectivo('');
          setCierreTarjeta('');
          setCierreTransferencia('');
          setCierreOtros('');
          setCuadraturaSeleccionada(null);
          setResumenRutaCierre(null);
        }
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al cerrar cuadratura.');
      }
    });
  };

  const handleReabrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadraturaSeleccionada || !reabrirMotivo.trim()) return showNotif('error', 'Completa todos los campos obligatorios.');

    startTransition(async () => {
      const res = await reabrirCuadraturaAction(cuadraturaSeleccionada.id, reabrirMotivo);
      if (res.success) {
        showNotif('success', 'Ruta reabierta para edición.');
        setPanel(null);
        setCuadraturaSeleccionada(null);
        setReobrirMotivo('');
        router.refresh();
      } else {
        showNotif('error', res.message ?? 'Error al reabrir.');
      }
    });
  };

  const handleAbrirRecepcion = (c: any) => {
    setCuadraturaSeleccionada(c);

    // Prellenar si la cuadratura ya tenía valores (o fue auto-cerrada al final de jornada)
    if (c.km_final) setCierreKmFinal(String(c.km_final));
    else if (c.km_inicial) setCierreKmFinal('');

    if (c.botellones_vacios?.[0]?.cantidad_total !== undefined) {
      setCierreVaciosTot(c.botellones_vacios[0].cantidad_total);
      setCierreVaciosDan(c.botellones_vacios[0].cantidad_danados || 0);
    }

    if (c.retorno?.length > 0) {
      const retMap: Record<string, number> = {};
      c.retorno.forEach((r: any) => { retMap[r.producto_id] = r.cantidad; });
      setCierreRetorno(retMap);
    }

    if (c.total_efectivo !== undefined && c.total_efectivo > 0) setCierreEfectivo(String(c.total_efectivo));
    if (c.total_tarjeta !== undefined && c.total_tarjeta > 0) setCierreTarjeta(String(c.total_tarjeta));
    if (c.total_transferencia !== undefined && c.total_transferencia > 0) setCierreTransferencia(String(c.total_transferencia));

    setPanel('cierre');
  };

  const handleCerrarJornada = async () => {
    if (!confirm('¿Deseas cerrar automáticamente todas las cuadraturas abiertas de la jornada? Los repartidores que llegaron tras el horario de cierre podrán cuadrarse físicamente con el recepcionista al día siguiente usando "Ajustar Cuadre".')) {
      return;
    }
    startTransition(async () => {
      const res = await cerrarJornadaCuadraturasAction();
      if (res.success) {
        showNotif('success', `Jornada cerrada exitosamente (${res.count} cuadraturas procesadas).`);
        router.refresh();
      } else {
        showNotif('error', res.message || 'Error al cerrar jornada.');
      }
    });
  };

  // Filtrado de cuadraturas
  const cuadraturasFiltradas = useMemo(() => {
    return historial.filter((c: any) => {
      const term = busqueda.toLowerCase();
      const fecha = new Date(c.fecha).toLocaleDateString('es-CL');
      const patente = c.vehiculo?.patente?.toLowerCase() || '';
      return (
        c.usuario?.nombre.toLowerCase().includes(term) ||
        c.usuario?.apellido?.toLowerCase().includes(term) ||
        patente.includes(term) ||
        fecha.includes(term)
      );
    });
  }, [historial, busqueda]);

  const abiertasCount = useMemo(() => historial.filter(c => c.estado === 'ABIERTA').length, [historial]);
  const cerradasCount = useMemo(() => historial.filter(c => c.estado === 'CERRADA').length, [historial]);
  const totalEfectivo = useMemo(() => {
    return historial.reduce((acc, c) => acc + Number(c.total_efectivo || 0), 0);
  }, [historial]);

  // Cálculos en vivo para el modal de Cierre y Recepción
  const calculoMatrizCuadre = useMemo(() => {
    if (!resumenRutaCierre || !cuadraturaSeleccionada) return [];

    const salidaItemsList = cuadraturaSeleccionada.salida || [];

    return productos.map(prod => {
      const salidaReg = salidaItemsList.find((s: any) => s.producto_id === prod.id);
      const salidaCant = salidaReg?.cantidad || 0;

      let entregadoRuta = 0;
      if (prod.categoria === 'BOTELLON20') {
        entregadoRuta = resumenRutaCierre.cantidades_ruta?.bot20_entregado || 0;
      } else if (prod.categoria === 'BOTELLON10') {
        entregadoRuta = resumenRutaCierre.cantidades_ruta?.bot10_entregado || 0;
      } else if (prod.categoria === 'SODA') {
        entregadoRuta = resumenRutaCierre.cantidades_ruta?.soda_entregada || 0;
      }

      const retornoCant = Number(cierreRetorno[prod.id]) || 0;
      const diferencia = salidaCant - (entregadoRuta + retornoCant);

      return {
        producto: prod,
        salida: salidaCant,
        ruta: entregadoRuta,
        retorno: retornoCant,
        diferencia,
        cuadra: diferencia === 0,
      };
    }).filter(row => row.salida > 0 || row.ruta > 0 || row.retorno > 0);
  }, [resumenRutaCierre, cuadraturaSeleccionada, productos, cierreRetorno]);

  const calculoVacios = useMemo(() => {
    const esperados = resumenRutaCierre?.cantidades_ruta?.vacios_esperados || 0;
    const recibidos = Number(cierreVaciosTot) || 0;
    const danados = totalDanados > 0 ? totalDanados : (Number(cierreVaciosDan) || 0);
    const diferencia = recibidos - esperados;
    return { esperados, recibidos, danados, diferencia, cuadra: diferencia === 0 };
  }, [resumenRutaCierre, cierreVaciosTot, cierreVaciosDan, totalDanados]);

  const calculoKmYCombustible = useMemo(() => {
    const kmIni = Number(cuadraturaSeleccionada?.km_inicial) || 0;
    const kmFin = Number(cierreKmFinal) || 0;
    const kmRecorridos = kmFin >= kmIni && kmIni > 0 ? kmFin - kmIni : 0;

    let montoComb = 0;
    if (cierreCombustible.habilitar && Number(cierreCombustible.monto) > 0) {
      montoComb = Number(cierreCombustible.monto);
    } else {
      montoComb = resumenRutaCierre?.combustible?.monto || cuadraturaSeleccionada?.monto_bencina || 0;
    }

    const costoPorKm = kmRecorridos > 0 && montoComb > 0 ? Math.round(montoComb / kmRecorridos) : null;

    return { kmIni, kmFin, kmRecorridos, montoComb, costoPorKm };
  }, [cuadraturaSeleccionada, cierreKmFinal, cierreCombustible, resumenRutaCierre]);

  const calculoFinancieroCierre = useMemo(() => {
    const finRuta = resumenRutaCierre?.financiero_ruta;
    const efectivoEsperado = Number(finRuta?.total_efectivo || 0);
    const tarjetaEsperada = Number(finRuta?.total_tarjeta || 0);
    const transferEsperada = Number(finRuta?.total_transferencia || 0);
    const creditoEsperado = Number(finRuta?.total_credito || 0);

    const efectivoRendido = cierreEfectivo !== '' ? Number(cierreEfectivo) : 0;
    const tarjetaRendida = cierreTarjeta !== '' ? Number(cierreTarjeta) : 0;
    const transferRendida = cierreTransferencia !== '' ? Number(cierreTransferencia) : 0;

    const diffEfectivo = efectivoRendido - efectivoEsperado;
    const diffTarjeta = tarjetaRendida - tarjetaEsperada;
    const diffTransfer = transferRendida - transferEsperada;

    const totalARendirEsperado = efectivoEsperado + tarjetaEsperada + transferEsperada;
    const totalRendidoDeclarado = efectivoRendido + tarjetaRendida + transferRendida;
    const diffTotal = totalRendidoDeclarado - totalARendirEsperado;

    const cajaCuadrada = (
      Math.abs(diffEfectivo) < 1 &&
      Math.abs(diffTarjeta) < 1 &&
      Math.abs(diffTransfer) < 1
    );

    return {
      efectivoEsperado,
      tarjetaEsperada,
      transferEsperada,
      creditoEsperado,
      efectivoRendido,
      tarjetaRendida,
      transferRendida,
      diffEfectivo,
      diffTarjeta,
      diffTransfer,
      totalARendirEsperado,
      totalRendidoDeclarado,
      diffTotal,
      cajaCuadrada,
    };
  }, [resumenRutaCierre, cierreEfectivo, cierreTarjeta, cierreTransferencia]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[9999] pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
          notification.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.type === 'success' ? <Check className="h-5 w-5 text-emerald-600" /> : 
           notification.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
           <AlertCircle className="h-5 w-5 text-rose-600" />}
          <p className="text-sm font-semibold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rutas en Reparto</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{abiertasCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-[#013299]">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuadraturas Cerradas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{cerradasCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Efectivo Rendido</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${totalEfectivo.toLocaleString('es-CL')}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flota Registrada</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{repartidores.length} choferes</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por repartidor, patente de vehículo o fecha..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#013299] focus:ring-2 focus:ring-[#013299]/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { 
              setPanel('salida'); 
              setCuadraturaSeleccionada(null); 
              setSalidaRep('');
              setSalidaEsNuevaVuelta(false);
              setSalidaNumeroVuelta(1);
              setSalidaKmInicial('');
              setSalidaItems({});
              setSalidaOtros('');
              setIncluirCombustible(false);
              setCombMonto('');
              setCombLitros('');
            }}
            className="bg-[#013299] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#013299]/20 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> 1. Salida de Camión
          </button>

          <button
            onClick={() => { setCuadraturaSeleccionada(null); setPanel('cierre'); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" /> 2. Recepción y Cuadratura
          </button>

          <button
            onClick={handleCerrarJornada}
            disabled={isPending}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
            title="Cierra automáticamente las cuadraturas abiertas de la jornada para repartidores que dejaron el camión tras el horario de cierre"
          >
            <Moon className="h-4 w-4 text-indigo-600" /> Auto-Cerrar Jornada
          </button>

          <button
            onClick={() => { setCuadraturaSeleccionada(null); setPanel('reabrir'); }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Unlock className="h-4 w-4" /> Reabrir
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Repartidor y Vehículo</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Ruta (Entregas)</th>
                <th className="py-3.5 px-4 text-center">Odómetro / Km</th>
                <th className="py-3.5 px-4 text-center">Cuadre</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cuadraturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm">No hay cuadraturas registradas</p>
                    <p className="text-xs text-slate-400 mt-0.5">Las cuadraturas generadas aparecerán aquí</p>
                  </td>
                </tr>
              ) : (
                cuadraturasFiltradas.map((c: any) => {
                  const resRuta = c.resumen_ruta;
                  const vehiculo = c.vehiculo || c.usuario?.vehiculo;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {new Date(c.fecha).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">
                          {c.usuario?.nombre} {c.usuario?.apellido || ''}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Truck className="w-3 h-3 text-[#013299]" />
                          {vehiculo?.patente || 'Sin vehículo'} {vehiculo?.modelo ? `(${vehiculo.modelo})` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            c.estado === 'ABIERTA' 
                              ? 'bg-blue-50 text-[#013299] border-blue-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {c.estado === 'ABIERTA' ? 'EN RUTA' : 'CERRADA'}
                          </span>
                          {c.resumen_ruta?.es_auto_cerrada && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200" title="Cierre automático al final de la jornada. Puede ajustarse físicamente si el chofer llegó tarde.">
                              <Moon className="w-2.5 h-2.5 text-indigo-600" /> Auto-Cerrada
                            </span>
                          )}
                          {(c.total_vueltas > 1 || c.vuelta_activa) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                              {c.estado === 'ABIERTA' 
                                ? `Vuelta ${c.vuelta_activa?.numero_vuelta || c.total_vueltas || 1}` 
                                : `${c.total_vueltas || 1} Vueltas`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ruta Entregas */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-extrabold text-slate-900 text-xs">{resRuta?.total_entregados || 0} un.</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {resRuta?.paradas_entregadas || 0}/{resRuta?.paradas_totales || 0} paradas
                        </div>
                      </td>

                      {/* Odómetro / Km Recorridos */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {resRuta?.km_recorridos !== null && resRuta?.km_recorridos !== undefined ? (
                          <div className="flex flex-col items-center">
                            <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                              {resRuta.km_recorridos} km
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {c.km_inicial ?? '—'} ➔ {c.km_final ?? '—'}
                            </span>
                          </div>
                        ) : c.km_inicial ? (
                          <span className="text-slate-500 text-[10px]">Salida: {c.km_inicial} km</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Cuadre */}
                      <td className="py-3.5 px-4 text-center">
                        {c.estado === 'ABIERTA' ? (
                          <span className="bg-blue-50 text-[#013299] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            ⏳ En Ruta
                          </span>
                        ) : resRuta?.estado_cuadre === 'CUADRADA' && resRuta?.financiero?.caja_cuadrada !== false ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1 mx-auto">
                              <CheckCheck className="w-3 h-3 text-emerald-600" /> Cuadrada
                            </span>
                            {resRuta?.financiero && (
                              <span className="text-[10px] text-emerald-700 font-mono font-bold">
                                ${Number(resRuta.financiero.total_rendido_chofer || 0).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 inline-flex items-center gap-1 mx-auto" title={`Llenos: ${resRuta?.diferencia_llenos || 0} | Vacíos: ${resRuta?.diferencia_vacios || 0} | Caja: ${resRuta?.financiero?.diferencia_caja || 0}`}>
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Descuadre
                            </span>
                            {resRuta?.financiero?.caja_cuadrada === false && (
                              <span className="text-[9px] text-rose-600 font-bold font-mono">
                                Caja: {resRuta.financiero.diferencia_caja > 0 ? '+' : ''}${Number(resRuta.financiero.diferencia_caja).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button 
                            onClick={() => { setCuadraturaSeleccionada(c); setDetalleTabVuelta('consolidado'); setPanel('detalle'); }}
                            className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1"
                            title="Ver auditoría completa de productos, vacíos y caja"
                          >
                            <Eye className="h-3.5 w-3.5" /> Detalle
                          </button>

                          {c.estado === 'ABIERTA' ? (
                            <button 
                              onClick={() => handleAbrirRecepcion(c)}
                              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1 shadow-sm"
                              title="Recepcionar camión y cerrar cuadratura"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Recepcionar
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAbrirRecepcion(c)}
                              className="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1"
                              title="Ajustar o completar cuadre físico (para repartidores que llegaron tras el cierre de fábrica)"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Ajustar Cuadre
                            </button>
                          )}

                          <button 
                            type="button"
                            onClick={() => handleAbrirNuevaVuelta(c)}
                            className="h-8 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1"
                            title="Agregar otra vuelta a este chofer"
                          >
                            <Plus className="h-3.5 w-3.5 text-indigo-600" /> Vuelta
                          </button>

                          {c.estado === 'CERRADA' && (
                            <button 
                              onClick={() => { setCuadraturaSeleccionada(c); setPanel('reabrir'); }}
                              className="h-8 px-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition-colors text-[11px] inline-flex items-center gap-1"
                              title="Reabrir ruta para edición completa"
                            >
                              <Unlock className="h-3.5 w-3.5 text-amber-600" /> Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      {panel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100">
            
            {/* Header Modal */}
            <div className={`px-6 py-4 flex justify-between items-center text-white ${
              panel === 'salida' ? 'bg-[#013299]' : 
              panel === 'cierre' ? 'bg-emerald-600' : 
              panel === 'nueva_vuelta' ? 'bg-indigo-700' :
              panel === 'reabrir' ? 'bg-amber-600' : 'bg-slate-900'
            }`}>
              <h2 className="text-base font-black flex items-center gap-2">
                {panel === 'salida' && (
                  salidaEsNuevaVuelta || salidaNumeroVuelta > 1
                    ? `🚀 Salida de Camión — Vuelta ${salidaNumeroVuelta}`
                    : '📤 1. Registrar Salida y Despacho de Camión'
                )}
                {panel === 'cierre' && (
                  `📥 2. Recepción en Fábrica — ${
                    resumenRutaCierre?.vuelta_activa?.numero_vuelta 
                      ? `Vuelta ${resumenRutaCierre.vuelta_activa.numero_vuelta}` 
                      : (cuadraturaSeleccionada?.vuelta_activa?.numero_vuelta 
                          ? `Vuelta ${cuadraturaSeleccionada.vuelta_activa.numero_vuelta}` 
                          : 'Cuadratura')
                  }`
                )}
                {panel === 'nueva_vuelta' && (
                  `🔄 Descarga y Carga: Vuelta ${nvVueltaTermina} ➔ Vuelta ${nvVueltaEmpieza}`
                )}
                {panel === 'reabrir' && '🔓 Reabrir Cuadratura'}
                {panel === 'detalle' && '📦 Auditoría Completa de Cuadratura'}
              </h2>
              <button 
                onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); setResumenRutaCierre(null); setNvResumenRuta(null); }} 
                className="p-1 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL DETALLES */}
            {panel === 'detalle' && cuadraturaSeleccionada && (
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <p className="text-[10px] text-[#013299] font-black uppercase tracking-wider">Repartidor y Vehículo</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}
                    </p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Patente: <strong>{cuadraturaSeleccionada.vehiculo?.patente || cuadraturaSeleccionada.usuario?.vehiculo?.patente || 'S/A'}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#013299] font-black uppercase tracking-wider">Fecha</p>
                    <p className="text-sm font-extrabold text-slate-900">
                      {new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')}
                    </p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      cuadraturaSeleccionada.estado === 'ABIERTA' ? 'bg-blue-100 text-[#013299]' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {cuadraturaSeleccionada.estado}
                    </span>
                  </div>
                </div>

                {/* Navegación por Pestañas: Consolidado vs Vueltas del Día */}
                {cuadraturaSeleccionada.vueltas && cuadraturaSeleccionada.vueltas.length > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDetalleTabVuelta('consolidado')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          detalleTabVuelta === 'consolidado'
                            ? 'bg-[#013299] text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        📊 Consolidado del Día ({cuadraturaSeleccionada.vueltas.length} {cuadraturaSeleccionada.vueltas.length === 1 ? 'Vuelta' : 'Vueltas'})
                      </button>

                      {cuadraturaSeleccionada.vueltas.map((v: any) => (
                        <button
                          key={v.numero_vuelta}
                          type="button"
                          onClick={() => setDetalleTabVuelta(v.numero_vuelta)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            detalleTabVuelta === v.numero_vuelta
                              ? 'bg-[#013299] text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>Vuelta {v.numero_vuelta}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                            v.estado === 'EN_RUTA'
                              ? (detalleTabVuelta === v.numero_vuelta ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800')
                              : (detalleTabVuelta === v.numero_vuelta ? 'bg-emerald-300 text-emerald-950' : 'bg-emerald-100 text-emerald-800')
                          }`}>
                            {v.estado === 'EN_RUTA' ? 'En ruta' : 'OK'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAbrirNuevaVuelta(cuadraturaSeleccionada)}
                      className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                      title="Agregar otra vuelta a este chofer"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Agregar Vuelta
                    </button>
                  </div>
                )}

                {/* VISTA 1: CONSOLIDADO DEL DÍA */}
                {detalleTabVuelta === 'consolidado' ? (
                  <>
                    {/* Resumen de Kilómetros y Bencina */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Km Inicial</span>
                        <span className="font-mono font-black text-slate-800 text-sm">{cuadraturaSeleccionada.km_inicial ?? '—'} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Km Final</span>
                        <span className="font-mono font-black text-slate-800 text-sm">{cuadraturaSeleccionada.km_final ?? '—'} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Km Recorridos</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          {cuadraturaSeleccionada.km_inicial && cuadraturaSeleccionada.km_final 
                            ? `${cuadraturaSeleccionada.km_final - cuadraturaSeleccionada.km_inicial} km` 
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Combustible</span>
                        <span className="font-mono font-black text-slate-800 text-sm">
                          ${Number(cuadraturaSeleccionada.monto_bencina || 0).toLocaleString('es-CL')}
                        </span>
                      </div>
                    </div>

                    {/* Matriz Completa de Productos (Lo que Salió vs Lo que Entró vs Entregado en Ruta) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#013299]" /> Balance Físico de Productos (Salió vs Entró)
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Control producto por producto: lo cargado al salir, lo entregado en ruta y el retorno devuelto a fábrica</p>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-[#013299] border border-blue-200">
                          {cuadraturaSeleccionada.resumen_ruta?.productos_matriz?.length || 0} productos controlados
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3">Producto</th>
                              <th className="py-2.5 px-3 text-center text-[#013299]">Cargado (Salió)</th>
                              <th className="py-2.5 px-3 text-center text-slate-700">Entregado en Ruta</th>
                              <th className="py-2.5 px-3 text-center text-emerald-800">Retorno Lleno (Entró)</th>
                              <th className="py-2.5 px-3 text-center">Cuadre / Diferencia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {(!cuadraturaSeleccionada.resumen_ruta?.productos_matriz || cuadraturaSeleccionada.resumen_ruta.productos_matriz.length === 0) ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                                  Sin registros de productos
                                </td>
                              </tr>
                            ) : (
                              cuadraturaSeleccionada.resumen_ruta.productos_matriz.map((pm: any) => {
                                const cuadrado = pm.diferencia === 0;
                                return (
                                  <tr key={pm.producto_id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <span className="font-extrabold text-slate-900">{pm.nombre}</span>
                                      <span className="text-[10px] text-slate-400 block">{pm.categoria}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold text-[#013299] font-mono">
                                      {pm.salida} un.
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">
                                      {pm.entregado} un.
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 font-mono">
                                      {pm.retorno} un.
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {cuadrado ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          <Check className="w-3 h-3 text-emerald-600" /> Cuadrado (0)
                                        </span>
                                      ) : pm.diferencia > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200" title="Faltan envases llenos respecto a lo cargado menos entregado">
                                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Faltan {pm.diferencia} un.
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                                          <Info className="w-3 h-3 text-sky-600" /> Sobran {Math.abs(pm.diferencia)} un.
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Envases Vacíos Recibidos y Dañados */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-600" /> Conteo de Envases Vacíos (Retorno a Fábrica)
                        </h3>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          (cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios ?? 0) === 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          {(cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios ?? 0) === 0 
                            ? '✔ Vacíos Cuadrados' 
                            : `⚠️ Dif Vacíos: ${cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios > 0 ? '+' : ''}${cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vacíos Esperados</span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {cuadraturaSeleccionada.resumen_ruta?.vacios_esperados ?? 0} envases
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Según recargas en ruta</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-blue-800 uppercase block">Vacíos Recibidos</span>
                          <span className="font-mono font-black text-blue-900 text-sm">
                            {cuadraturaSeleccionada.resumen_ruta?.vacios_recibidos ?? 0} envases
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Conteo físico en fábrica</span>
                        </div>

                        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-rose-900 uppercase block flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Vacíos Dañados / Bajas
                          </span>
                          <span className="font-mono font-black text-rose-950 text-sm">
                            {cuadraturaSeleccionada.resumen_ruta?.vacios_danados ?? 0} rotos
                          </span>
                          <span className="text-[10px] text-rose-700 block mt-0.5">Descontados de stock</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Diferencia Vacíos</span>
                          <span className={`font-mono font-black text-sm ${
                            (cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios ?? 0) === 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {(cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios ?? 0) > 0 ? '+' : ''}
                            {cuadraturaSeleccionada.resumen_ruta?.diferencia_vacios ?? 0} envases
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Recibidos vs Esperados</span>
                        </div>
                      </div>
                    </div>

                    {/* Control de Accesorios y Bombas */}
                    {(cuadraturaSeleccionada.gastos?.some((g: any) => g.tipo === 'ACCESORIOS_SALIDA' || g.tipo === 'ACCESORIOS_RETORNO')) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Control de Accesorios, Bombas y Otros
                        </h3>
                        {cuadraturaSeleccionada.gastos.filter((g: any) => g.tipo === 'ACCESORIOS_SALIDA').map((g: any) => (
                          <div key={g.id} className="text-xs flex items-center gap-2 text-blue-900 bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                            <Package className="w-4 h-4 text-blue-700 shrink-0" />
                            <span><strong>Llevados al salir:</strong> {g.descripcion}</span>
                          </div>
                        ))}
                        {cuadraturaSeleccionada.gastos.filter((g: any) => g.tipo === 'ACCESORIOS_RETORNO').map((g: any) => (
                          <div key={g.id} className="text-xs flex items-center gap-2 text-emerald-900 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span><strong>Retornados a fábrica:</strong> {g.descripcion}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rendición Financiera / Cierre de Caja del Chofer */}
                    {cuadraturaSeleccionada.estado === 'CERRADA' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 flex-wrap gap-2">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-emerald-600" /> Cierre de Caja del Repartidor (Rendición)
                          </h3>
                          {cuadraturaSeleccionada.resumen_ruta?.financiero && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              cuadraturaSeleccionada.resumen_ruta.financiero.caja_cuadrada
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {cuadraturaSeleccionada.resumen_ruta.financiero.caja_cuadrada ? '✔ Caja Cuadrada' : '⚠️ Descuadre de Caja'}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-emerald-600" /> Efectivo
                            </span>
                            <span className="font-mono font-black text-slate-900 text-sm">
                              ${Number(cuadraturaSeleccionada.total_efectivo || 0).toLocaleString('es-CL')}
                            </span>
                            {cuadraturaSeleccionada.resumen_ruta?.financiero?.total_efectivo_esperado !== undefined && (
                              <span className="text-[10px] text-slate-400 block">
                                Esp: ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.total_efectivo_esperado).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-indigo-800 uppercase block flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-indigo-600" /> Tarjeta POS
                            </span>
                            <span className="font-mono font-black text-slate-900 text-sm">
                              ${Number(cuadraturaSeleccionada.total_tarjeta || 0).toLocaleString('es-CL')}
                            </span>
                            {cuadraturaSeleccionada.resumen_ruta?.financiero?.total_tarjeta_esperado !== undefined && (
                              <span className="text-[10px] text-slate-400 block">
                                Esp: ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.total_tarjeta_esperado).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-sky-800 uppercase block flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-sky-600" /> Transferencia
                            </span>
                            <span className="font-mono font-black text-slate-900 text-sm">
                              ${Number(cuadraturaSeleccionada.total_transferencia || 0).toLocaleString('es-CL')}
                            </span>
                            {cuadraturaSeleccionada.resumen_ruta?.financiero?.total_transferencia_esperado !== undefined && (
                              <span className="text-[10px] text-slate-400 block">
                                Esp: ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.total_transferencia_esperado).toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>

                          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200">
                            <span className="text-[10px] font-bold text-purple-900 uppercase block flex items-center gap-1">
                              <FileText className="w-3 h-3 text-purple-600" /> Crédito / Guía
                            </span>
                            <span className="font-mono font-black text-purple-950 text-sm">
                              ${Number(cuadraturaSeleccionada.resumen_ruta?.financiero?.total_credito_esperado || 0).toLocaleString('es-CL')}
                            </span>
                            <span className="text-[9px] text-purple-700 block font-semibold">Excluido de caja</span>
                          </div>
                        </div>

                        {cuadraturaSeleccionada.resumen_ruta?.financiero && (
                          <div className="flex items-center justify-between bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs">
                            <div>
                              <span className="text-slate-500 font-bold">Total Rendido: </span>
                              <span className="font-mono font-black text-slate-900">
                                ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.total_rendido_chofer).toLocaleString('es-CL')}
                              </span>
                              <span className="text-slate-400 text-[11px] ml-2 font-mono">
                                (Esperado: ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.total_a_rendir_esperado).toLocaleString('es-CL')})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold">Diferencia: </span>
                              <span className={`font-mono font-black ${
                                cuadraturaSeleccionada.resumen_ruta.financiero.diferencia_caja === 0
                                  ? 'text-emerald-700'
                                  : cuadraturaSeleccionada.resumen_ruta.financiero.diferencia_caja > 0
                                    ? 'text-blue-700'
                                    : 'text-rose-700'
                              }`}>
                                {cuadraturaSeleccionada.resumen_ruta.financiero.diferencia_caja > 0 ? '+' : ''}
                                ${Number(cuadraturaSeleccionada.resumen_ruta.financiero.diferencia_caja).toLocaleString('es-CL')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* VISTA 2: DESGLOSE DE VUELTA ESPECÍFICA */
                  (() => {
                    const vueltaSel = cuadraturaSeleccionada.vueltas?.find((v: any) => v.numero_vuelta === detalleTabVuelta);
                    if (!vueltaSel) return null;
                    const kmRec = (vueltaSel.km_llegada && vueltaSel.km_salida) ? (vueltaSel.km_llegada - vueltaSel.km_salida) : null;

                    return (
                      <div className="space-y-4">
                        <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl flex justify-between items-center flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Detalle de Recorrido</span>
                            <span className="text-base font-black text-indigo-950">Vuelta {vueltaSel.numero_vuelta}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                            vueltaSel.estado === 'EN_RUTA' 
                              ? 'bg-amber-100 text-amber-900 border-amber-300' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {vueltaSel.estado === 'EN_RUTA' ? '⏳ En Ruta' : '✔ Recepcionada en Fábrica'}
                          </span>
                        </div>

                        {/* Odómetro y Horarios de la Vuelta */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Km Salida</span>
                            <span className="font-mono font-black text-slate-800 text-sm">{vueltaSel.km_salida ?? '—'} km</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Km Llegada</span>
                            <span className="font-mono font-black text-slate-800 text-sm">{vueltaSel.km_llegada ?? 'En ruta'} {vueltaSel.km_llegada ? 'km' : ''}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Recorrido Vuelta</span>
                            <span className="font-mono font-black text-emerald-700 text-sm">{kmRec !== null ? `${kmRec} km` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Horarios</span>
                            <span className="text-xs font-bold text-slate-700 block">
                              {vueltaSel.hora_salida ? new Date(vueltaSel.hora_salida).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              {' ➔ '}
                              {vueltaSel.hora_llegada ? new Date(vueltaSel.hora_llegada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </span>
                          </div>
                        </div>

                        {/* Productos de la Vuelta: Salida vs Retorno */}
                        {(() => {
                          const productosVueltaMap = new Map<string, { id: string; nombre: string; salida: number; retorno: number }>();
                          (vueltaSel.items_salida || []).forEach((item: any) => {
                            const prod = productos.find(p => p.id === item.producto_id);
                            const nombre = prod?.nombre || 'Producto';
                            const curr = productosVueltaMap.get(item.producto_id) || { id: item.producto_id, nombre, salida: 0, retorno: 0 };
                            curr.salida += Number(item.cantidad || 0);
                            productosVueltaMap.set(item.producto_id, curr);
                          });
                          (vueltaSel.items_retorno || []).forEach((item: any) => {
                            const prod = productos.find(p => p.id === item.producto_id);
                            const nombre = prod?.nombre || 'Producto';
                            const curr = productosVueltaMap.get(item.producto_id) || { id: item.producto_id, nombre, salida: 0, retorno: 0 };
                            curr.retorno += Number(item.cantidad || 0);
                            productosVueltaMap.set(item.producto_id, curr);
                          });
                          const itemsVuelta = Array.from(productosVueltaMap.values());

                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-[#013299]" /> Productos en Vuelta {vueltaSel.numero_vuelta} (Salió vs Entró)
                                </p>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {itemsVuelta.length} productos registrados
                                </span>
                              </div>

                              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                      <th className="py-2.5 px-3">Producto</th>
                                      <th className="py-2.5 px-3 text-center text-[#013299]">Cargado (Salió)</th>
                                      <th className="py-2.5 px-3 text-center text-emerald-800">Retorno Lleno (Entró)</th>
                                      <th className="py-2.5 px-3 text-center text-slate-700">Consumido / Dejado en Ruta</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {itemsVuelta.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="text-center py-4 text-slate-400 italic">
                                          Sin registros de productos en esta vuelta
                                        </td>
                                      </tr>
                                    ) : (
                                      itemsVuelta.map((iv) => {
                                        const enRuta = iv.salida - iv.retorno;
                                        return (
                                          <tr key={iv.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2.5 px-3 font-extrabold text-slate-900">{iv.nombre}</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-[#013299] font-mono">{iv.salida} un.</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700 font-mono">{iv.retorno} un.</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">
                                              {enRuta >= 0 ? `${enRuta} un.` : `+${Math.abs(enRuta)} un.`}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Vacíos y Efectivo de la Vuelta */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Vacíos Recibidos</span>
                            <span className="font-mono font-bold text-blue-900 text-sm">{vueltaSel.vacios_totales ?? '—'} envases</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Vacíos Dañados</span>
                            <span className="font-mono font-bold text-rose-700 text-sm">{vueltaSel.vacios_danados ?? 0} rotos</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Efectivo Rendido</span>
                            <span className="font-mono font-black text-emerald-900 text-sm">
                              {vueltaSel.efectivo_rendido !== undefined ? `$${Number(vueltaSel.efectivo_rendido).toLocaleString('es-CL')}` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Accesorios Vuelta */}
                        {(vueltaSel.accesorios_salida || vueltaSel.accesorios_retorno) && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Accesorios de esta Vuelta</span>
                            {vueltaSel.accesorios_salida && (
                              <p className="text-blue-900"><strong>Salieron:</strong> {vueltaSel.accesorios_salida}</p>
                            )}
                            {vueltaSel.accesorios_retorno && (
                              <p className="text-emerald-900"><strong>Retornaron:</strong> {vueltaSel.accesorios_retorno}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} 
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              </div>
            )}

            {/* FORMULARIO 1: SALIDA DE CAMIÓN */}
            {panel === 'salida' && (
              <form onSubmit={handleSalida} className="p-6 overflow-y-auto space-y-5">
                {salidaEsNuevaVuelta || salidaNumeroVuelta > 1 ? (
                  <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl text-xs text-indigo-900 font-semibold flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Registrando salida para <strong>Vuelta {salidaNumeroVuelta}</strong> en la misma jornada</span>
                    </div>
                    <span className="text-[10px] bg-indigo-200/70 text-indigo-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                      Misma Cuadratura
                    </span>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 font-medium flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#013299] shrink-0 mt-0.5" />
                    <div>
                      Registra la carga que sale en el camión al iniciar la jornada (Vuelta 1). Si el chofer realiza más salidas hoy, podrás agregar vueltas dentro de esta misma hoja.
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Repartidor *</label>
                    <select 
                      value={salidaRep} 
                      onChange={e => setSalidaRep(e.target.value)} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#013299]"
                    >
                      <option value="">— Seleccionar repartidor —</option>
                      {repartidores.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} {r.apellido || ''} {r.vehiculo ? `(${r.vehiculo.patente})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fecha *</label>
                    <input 
                      type="date" 
                      value={salidaFecha} 
                      max={maxDate} 
                      onChange={e => {
                        const ajustada = handleDateInputSoloHabiles(e.target.value, (msg) => showNotif('warning', msg));
                        setSalidaFecha(ajustada);
                      }} 
                      required 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#013299]" 
                    />
                  </div>
                </div>

                {/* Info del Vehículo Asignado y Expectativa de la Ruta */}
                {datosSalidaPrevios && (
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center flex-wrap gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] block">Vehículo Asignado:</span>
                      <span className="font-black text-[#013299] text-sm">
                        {datosSalidaPrevios.vehiculo?.patente || 'Sin vehículo asignado'}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-1">
                        {datosSalidaPrevios.vehiculo?.modelo ? `(${datosSalidaPrevios.vehiculo.modelo})` : ''}
                      </span>
                    </div>

                    {datosSalidaPrevios.expectativa_ruta?.total_paradas > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-bold text-slate-500 uppercase text-[10px] block">Ruta del Día:</span>
                          <span className="font-extrabold text-slate-800">
                            20L: {datosSalidaPrevios.expectativa_ruta.bot20} | 10L: {datosSalidaPrevios.expectativa_ruta.bot10} | Soda: {datosSalidaPrevios.expectativa_ruta.soda}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCargarSegunRuta}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 active:scale-95"
                          title="Cargar automáticamente los botellones que pide la ruta"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" /> Cargar según Ruta
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Kilometraje y Combustible */}
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  {salidaRep && (esPrimeraSalida || salidaEsNuevaVuelta) && (
                    <div className="flex flex-col gap-1.5 bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-[#013299] uppercase tracking-wider flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-[#013299]" /> 
                          {salidaEsNuevaVuelta ? `Kilometraje de Salida (Vuelta ${salidaNumeroVuelta}) *` : 'Kilometraje Inicial del Vehículo *'}
                        </label>
                        {datosSalidaPrevios?.km_sugerido > 0 && (
                          <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                            Odómetro: {datosSalidaPrevios.km_sugerido} km
                          </span>
                        )}
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        required 
                        value={salidaKmInicial} 
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={e => setSalidaKmInicial(e.target.value)} 
                        className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#013299]/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="Ej: 145000"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={incluirCombustible} 
                        onChange={e => setIncluirCombustible(e.target.checked)} 
                        className="w-4 h-4 text-[#013299] rounded" 
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Fuel className="w-4 h-4 text-amber-500" /> Registrar Carga de Combustible
                      </span>
                    </label>
                    
                    {incluirCombustible && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Combustible *</label>
                          <select value={combTipo} onChange={e => setCombTipo(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
                            <option value="DIESEL">Diesel</option>
                            <option value="BENCINA">Bencina</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Monto ($) *</label>
                          <input 
                            type="number" 
                            required 
                            min="1" 
                            value={combMonto} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => setCombMonto(e.target.value)} 
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            placeholder="Ej: 25000" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Litros Cargados (Opcional)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={combLitros} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => setCombLitros(e.target.value)} 
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            placeholder="Ej: 24.5" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Factura / Boleta</label>
                          <input type="text" value={combNumFactura} onChange={e => setCombNumFactura(e.target.value)} className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs" placeholder="Ej: 88512" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Cantidades a Cargar al Camión</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {productos.map(p => (
                      <div key={p.id} className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={p.nombre}>{p.nombre}</span>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          value={salidaItems[p.id] === undefined ? '' : salidaItems[p.id]} 
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          onChange={e => {
                            const val = e.target.value;
                            setSalidaItems(prev => ({ 
                              ...prev, 
                              [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                            }));
                          }} 
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono font-bold focus:border-[#013299] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Control de Otros / Bombas / Accesorios Llevados */}
                <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#013299]" /> Bombas, Dispensadores u Otros Accesorios Llevados (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={salidaOtros} 
                    onChange={e => setSalidaOtros(e.target.value)} 
                    placeholder="Ej: 2 Bombas USB, 1 Soporte sobremesa, dispensador manual..." 
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#013299]" 
                  />
                  <span className="text-[10px] text-slate-400">
                    Registro de control para fábrica. No interviene en la cuadratura de botellones de la ruta.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setPanel(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-[#013299] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">
                    {isPending ? 'Procesando...' : (salidaEsNuevaVuelta || salidaNumeroVuelta > 1 ? `Confirmar Carga y Despachar Vuelta ${salidaNumeroVuelta}` : 'Confirmar Carga y Despacho')}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULARIO 2: RECEPCIÓN EN FÁBRICA Y CUADRATURA */}
            {panel === 'cierre' && (
              <form onSubmit={handleCierre} className="p-6 overflow-y-auto space-y-6">
                
                {/* Selector de Ruta Pendiente */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Repartidor y Ruta a Recepcionar *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-emerald-300 bg-emerald-50/70 p-3.5 rounded-xl font-bold text-emerald-900 flex justify-between items-center text-xs">
                      <div>
                        <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')} — {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}</span>
                        <span className="block text-[11px] text-emerald-700 font-mono mt-0.5">
                          Vehículo: {resumenRutaCierre?.vehiculo?.patente || 'S/A'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setCuadraturaSeleccionada(null); setResumenRutaCierre(null); }}
                        className="text-xs text-emerald-700 underline font-semibold hover:text-emerald-900"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <select 
                      required 
                      value={cuadraturaSeleccionada?.id || ''} 
                      onChange={e => {
                        const c = historial.find(item => item.id === e.target.value);
                        setCuadraturaSeleccionada(c || null);
                      }} 
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                    >
                      <option value="">— Selecciona la ruta en curso a recepcionar —</option>
                      {historial.filter(c => c.estado === 'ABIERTA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString('es-CL')} - {c.usuario?.nombre} {c.usuario?.apellido || ''} ({c.vehiculo?.patente || 'Camión'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {cargandoDatosRuta ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse text-xs font-bold">
                    Cargando entregas completadas en ruta...
                  </div>
                ) : resumenRutaCierre && (
                  <>
                    {/* SECCIÓN 1: PROGRESO Y ENTREGAS EN RUTA */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-[#013299] uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="w-4 h-4" /> 1. Entregas Realizadas en Ruta (Despacho)
                        </span>
                        <span className="bg-blue-100 text-[#013299] text-xs font-black px-2.5 py-0.5 rounded-full">
                          {resumenRutaCierre.ruta.paradas_entregadas} de {resumenRutaCierre.ruta.paradas_totales} paradas ({resumenRutaCierre.ruta.porcentaje}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Botellón 20L</span>
                          <span className="text-base font-black text-slate-900">{resumenRutaCierre.cantidades_ruta.bot20_entregado} un.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Botellón 10L</span>
                          <span className="text-base font-black text-slate-900">{resumenRutaCierre.cantidades_ruta.bot10_entregado} un.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Soda</span>
                          <span className="text-base font-black text-slate-900">{resumenRutaCierre.cantidades_ruta.soda_entregada} un.</span>
                        </div>
                        <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[10px] text-[#013299] font-bold uppercase block">Vacíos Esperados</span>
                          <span className="text-base font-black text-[#013299]">{resumenRutaCierre.cantidades_ruta.vacios_esperados} envases</span>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 2: CONTEO FÍSICO AL LLEGAR A FÁBRICA */}
                    <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-4">
                      <div className="border-b border-emerald-100 pb-2">
                        <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-emerald-600" /> 2. Conteo Físico en Fábrica (Recepción)
                        </span>
                      </div>

                      {/* Odómetro y Kilometraje */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Km Salida</label>
                          <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
                            {cuadraturaSeleccionada.km_inicial ?? '—'} km
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-emerald-800 uppercase">Km Llegada (Odómetro) *</label>
                          <input 
                            type="number" 
                            min="0"
                            required 
                            value={cierreKmFinal} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => setCierreKmFinal(e.target.value)} 
                            className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            placeholder="Ej: 145599"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Recorrido de la Jornada</label>
                          <div className="px-3 py-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs font-mono font-black text-emerald-900">
                            {calculoKmYCombustible.kmRecorridos} km
                          </div>
                        </div>
                      </div>

                      {/* Retorno de Productos Llenos */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Productos que vuelven LLENOS en el camión
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {productos.map(p => (
                            <div key={p.id} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800 truncate pr-1">{p.nombre}</span>
                              <input 
                                type="number" 
                                min="0" 
                                placeholder="0" 
                                value={cierreRetorno[p.id] === undefined ? '' : cierreRetorno[p.id]} 
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCierreRetorno(prev => ({ 
                                    ...prev, 
                                    [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                                  }));
                                }} 
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-mono font-bold text-emerald-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Envases Vacíos Totales Recibidos */}
                      <div className="pt-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-blue-900 uppercase">Envases Vacíos Totales Recibidos *</label>
                            {resumenRutaCierre?.cantidades_ruta?.vacios_esperados !== undefined && (
                              <span className="text-[10px] text-blue-700 font-semibold">
                                Esperados en ruta: {resumenRutaCierre.cantidades_ruta.vacios_esperados} envases
                              </span>
                            )}
                          </div>
                          <input 
                            type="number" 
                            min="0" 
                            required
                            value={cierreVaciosTot === undefined ? '' : cierreVaciosTot} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const val = e.target.value;
                              setCierreVaciosTot(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                            }} 
                            className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono text-center font-black text-blue-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-400/20" 
                            placeholder="0" 
                          />
                        </div>
                      </div>

                      {/* Desglose de Envases Vacíos Dañados / Rotos por Producto (Para quitarlos del stock) */}
                      <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600" /> Envases Dañados / Rotos (Se darán de baja del stock de fábrica)
                          </label>
                          <span className="text-[11px] font-black text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            Total dañados: {totalDanados} un.
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-800">
                          Especifica las unidades que llegaron rotas o defectuosas por cada producto para descontarlas automáticamente del inventario:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {productos.map(p => (
                            <div key={p.id} className="bg-white border border-rose-200 p-2.5 rounded-xl flex items-center justify-between shadow-2xs">
                              <span className="text-xs font-bold text-slate-700 truncate pr-1" title={p.nombre}>{p.nombre}</span>
                              <input 
                                type="number" 
                                min="0" 
                                placeholder="0" 
                                value={cierreDanadosDetalle[p.id] === undefined ? '' : cierreDanadosDetalle[p.id]} 
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCierreDanadosDetalle(prev => ({ 
                                    ...prev, 
                                    [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                                  }));
                                }} 
                                className="w-16 px-2 py-1 bg-rose-50/50 border border-rose-300 rounded-lg text-xs text-center font-mono font-black text-rose-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-rose-400/20" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Control de Otros / Bombas / Accesorios que Retornan */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-indigo-600" /> Control de Accesorios, Bombas y Otros
                          </label>
                          {resumenRutaCierre?.accesorios?.salida && (
                            <span className="text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              Llevados al salir: <strong>{resumenRutaCierre.accesorios.salida}</strong>
                            </span>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={cierreOtros} 
                          onChange={e => setCierreOtros(e.target.value)} 
                          placeholder="Ej: Volvió 1 bomba USB, 1 dispensador sobremesa entregado en cliente..." 
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-600" 
                        />
                        <p className="text-[10px] text-slate-400">
                          Anotación operativa de retorno. No interviene en la cuadratura de botellones.
                        </p>
                      </div>

                    </div>

                    {/* SECCIÓN 3: CIERRE DE CAJA DEL REPARTIDOR (CONCILIACIÓN FINANCIERA) */}
                    <div className="bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/50 border-2 border-emerald-200/80 rounded-2xl p-4 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b border-emerald-100 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                              3. Cierre de Caja del Repartidor (Conciliación Financiera)
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Cuadratura de medios de pago cobrados en mano vs recaudación física del chofer
                            </span>
                          </div>
                        </div>

                        {/* Badge de Estado del Cuadre de Caja */}
                        <div>
                          {calculoFinancieroCierre.cajaCuadrada ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Caja Cuadrada
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Descuadre en Caja ({calculoFinancieroCierre.diffTotal > 0 ? `Sobran $${Math.abs(calculoFinancieroCierre.diffTotal).toLocaleString('es-CL')}` : `Faltan $${Math.abs(calculoFinancieroCierre.diffTotal).toLocaleString('es-CL')}`})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recuadro Excluido de Caja: Guías y Facturas a Crédito Empresa */}
                      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-purple-600 text-white rounded-xl shadow-2xs">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-purple-950 uppercase tracking-wide">
                                Guía / Factura a Crédito Empresa
                              </span>
                              <span className="bg-purple-200/80 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                                Excluido de Caja Chofer
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-800/90 leading-tight">
                              Estas entregas no se cobran en mano. Se facturan directo a la cuenta corriente del cliente a fin de mes.
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-purple-600 font-bold uppercase block">Total Crédito Facturación</span>
                          <span className="text-base font-black text-purple-950 font-mono">
                            ${calculoFinancieroCierre.creditoEsperado.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>

                      {/* Tarjetas de Medios de Pago a Rendir (Efectivo, Tarjeta, Transferencia) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. Efectivo Físico */}
                        <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                          Math.abs(calculoFinancieroCierre.diffEfectivo) < 1
                            ? 'bg-emerald-50/50 border-emerald-300'
                            : 'bg-rose-50/60 border-rose-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase">
                              <Banknote className="w-4 h-4 text-emerald-600" /> 1. Efectivo
                            </span>
                            <button
                              type="button"
                              onClick={() => setCierreEfectivo(calculoFinancieroCierre.efectivoEsperado)}
                              className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                              title="Copiar monto esperado"
                            >
                              <Copy className="w-3 h-3" /> Copiar esperado
                            </button>
                          </div>

                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Esperado en ruta:</span>
                            <span className="font-mono font-black text-slate-800">
                              ${calculoFinancieroCierre.efectivoEsperado.toLocaleString('es-CL')}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase block">
                              Billetes / Monedas Rendidos ($) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={cierreEfectivo === undefined ? '' : cierreEfectivo}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onChange={e => {
                                const val = e.target.value;
                                setCierreEfectivo(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-sm font-mono text-center font-black text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          <div className="text-center pt-1">
                            {Math.abs(calculoFinancieroCierre.diffEfectivo) < 1 ? (
                              <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                                ✔ Efectivo Cuadrado
                              </span>
                            ) : calculoFinancieroCierre.diffEfectivo < 0 ? (
                              <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                                ✘ Faltan ${Math.abs(calculoFinancieroCierre.diffEfectivo).toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                ✘ Sobran ${calculoFinancieroCierre.diffEfectivo.toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Tarjeta (POS / Transbank) */}
                        <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                          Math.abs(calculoFinancieroCierre.diffTarjeta) < 1
                            ? 'bg-blue-50/50 border-blue-300'
                            : 'bg-rose-50/60 border-rose-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase">
                              <CreditCard className="w-4 h-4 text-blue-600" /> 2. Tarjeta POS
                            </span>
                            <button
                              type="button"
                              onClick={() => setCierreTarjeta(calculoFinancieroCierre.tarjetaEsperada)}
                              className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                              title="Copiar monto esperado"
                            >
                              <Copy className="w-3 h-3" /> Copiar esperado
                            </button>
                          </div>

                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Esperado en ruta:</span>
                            <span className="font-mono font-black text-slate-800">
                              ${calculoFinancieroCierre.tarjetaEsperada.toLocaleString('es-CL')}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase block">
                              Vouchers POS Rendidos ($) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={cierreTarjeta === undefined ? '' : cierreTarjeta}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onChange={e => {
                                const val = e.target.value;
                                setCierreTarjeta(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-blue-400 rounded-xl text-sm font-mono text-center font-black text-blue-950 outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          <div className="text-center pt-1">
                            {Math.abs(calculoFinancieroCierre.diffTarjeta) < 1 ? (
                              <span className="text-[11px] font-black text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
                                ✔ Vouchers Cuadrados
                              </span>
                            ) : calculoFinancieroCierre.diffTarjeta < 0 ? (
                              <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                                ✘ Faltan vouchers por ${Math.abs(calculoFinancieroCierre.diffTarjeta).toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                ✘ Sobran vouchers por ${calculoFinancieroCierre.diffTarjeta.toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. Transferencias Bancarias */}
                        <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                          Math.abs(calculoFinancieroCierre.diffTransfer) < 1
                            ? 'bg-indigo-50/50 border-indigo-300'
                            : 'bg-rose-50/60 border-rose-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase">
                              <Smartphone className="w-4 h-4 text-indigo-600" /> 3. Transferencia
                            </span>
                            <button
                              type="button"
                              onClick={() => setCierreTransferencia(calculoFinancieroCierre.transferEsperada)}
                              className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                              title="Copiar monto esperado"
                            >
                              <Copy className="w-3 h-3" /> Copiar esperado
                            </button>
                          </div>

                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Esperado en ruta:</span>
                            <span className="font-mono font-black text-slate-800">
                              ${calculoFinancieroCierre.transferEsperada.toLocaleString('es-CL')}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase block">
                              Comprobantes Validados ($) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={cierreTransferencia === undefined ? '' : cierreTransferencia}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onChange={e => {
                                const val = e.target.value;
                                setCierreTransferencia(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-indigo-400 rounded-xl text-sm font-mono text-center font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          <div className="text-center pt-1">
                            {Math.abs(calculoFinancieroCierre.diffTransfer) < 1 ? (
                              <span className="text-[11px] font-black text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-md">
                                ✔ Comprobantes OK
                              </span>
                            ) : calculoFinancieroCierre.diffTransfer < 0 ? (
                              <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                                ✘ Faltan comprobantes por ${Math.abs(calculoFinancieroCierre.diffTransfer).toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                                ✘ Sobran comprobantes por ${calculoFinancieroCierre.diffTransfer.toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumen Total de Cuadratura de Caja */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center flex-wrap gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total a Rendir por el Chofer</span>
                          <span className="font-extrabold text-slate-900 text-sm font-mono">
                            ${calculoFinancieroCierre.totalARendirEsperado.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Declarado Rendido</span>
                          <span className="font-extrabold text-slate-900 text-sm font-mono">
                            ${calculoFinancieroCierre.totalRendidoDeclarado.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Diferencia de Caja</span>
                          <span className={`font-black text-sm font-mono ${
                            calculoFinancieroCierre.diffTotal === 0 ? 'text-emerald-600' :
                            calculoFinancieroCierre.diffTotal > 0 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {calculoFinancieroCierre.diffTotal === 0 ? '$0 (Cuadrada)' :
                             calculoFinancieroCierre.diffTotal > 0 ? `+$${calculoFinancieroCierre.diffTotal.toLocaleString('es-CL')} (Sobra)` :
                             `-$${Math.abs(calculoFinancieroCierre.diffTotal).toLocaleString('es-CL')} (Falta)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 4: MATRIZ DE CUADRATURA FÍSICA EN VIVO (CONCILIACIÓN) */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCheck className="w-4 h-4 text-[#013299]" /> 4. Cuadratura y Conciliación Física Automática
                        </span>
                      </div>

                      {/* Tabla comparativa de Llenos */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                              <th className="p-2">Producto</th>
                              <th className="p-2 text-center">1. Salida (Cargado)</th>
                              <th className="p-2 text-center">2. Vendido Ruta</th>
                              <th className="p-2 text-center">3. Retorno Lleno</th>
                              <th className="p-2 text-center">Diferencia</th>
                              <th className="p-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {calculoMatrizCuadre.map(row => (
                              <tr key={row.producto.id} className={!row.cuadra ? 'bg-rose-50/30' : ''}>
                                <td className="p-2 font-bold">{row.producto.nombre}</td>
                                <td className="p-2 text-center font-mono">{row.salida}</td>
                                <td className="p-2 text-center font-mono text-[#013299]">{row.ruta}</td>
                                <td className="p-2 text-center font-mono text-emerald-700">{row.retorno}</td>
                                <td className="p-2 text-center font-mono font-black">
                                  {row.diferencia === 0 ? (
                                    <span className="text-emerald-600">0</span>
                                  ) : row.diferencia > 0 ? (
                                    <span className="text-rose-600">-{row.diferencia} (Faltan)</span>
                                  ) : (
                                    <span className="text-amber-600">+{Math.abs(row.diferencia)} (Sobran)</span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  {row.cuadra ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                      ✔ Cuadrado
                                    </span>
                                  ) : (
                                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                      ✘ Descuadre
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Tarjetas de Conciliación de Envases y Combustible */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Envases */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          calculoVacios.cuadra ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block">Balance de Envases Vacíos</span>
                            <span className="font-extrabold">
                              {calculoVacios.recibidos} recibidos vs {calculoVacios.esperados} esperados
                            </span>
                          </div>
                          <div>
                            {calculoVacios.cuadra ? (
                              <span className="bg-emerald-200/60 font-black px-2.5 py-1 rounded-lg text-emerald-800">
                                ✔ Exacto
                              </span>
                            ) : (
                              <span className="bg-amber-200/80 font-black px-2.5 py-1 rounded-lg text-amber-900">
                                {calculoVacios.diferencia < 0 ? `Faltan ${Math.abs(calculoVacios.diferencia)}` : `Sobran ${calculoVacios.diferencia}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Combustible & Mantención */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cálculo Bencina / Mantención</span>
                            <span className="font-extrabold text-slate-800">
                              {calculoKmYCombustible.kmRecorridos} km recorridos
                            </span>
                            {calculoKmYCombustible.costoPorKm && (
                              <span className="text-[11px] text-slate-500 block">
                                Costo: ${calculoKmYCombustible.costoPorKm} / km
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                            ${calculoKmYCombustible.montoComb.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>

                    </div>
                  </>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2 flex-wrap">
                  <button 
                    type="button" 
                    onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); setResumenRutaCierre(null); }} 
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      type="button"
                      disabled={isPending || !cuadraturaSeleccionada}
                      onClick={() => handleAbrirNuevaVuelta(cuadraturaSeleccionada)}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 flex items-center gap-1.5"
                      title="Descargar camión de esta vuelta y cargar productos para la siguiente vuelta"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isPending ? 'Procesando...' : `Descargar y Salir a Vuelta ${(resumenRutaCierre?.vuelta_activa?.numero_vuelta || cuadraturaSeleccionada?.total_vueltas || 1) + 1}`}
                    </button>

                    <button 
                      type="button" 
                      disabled={isPending || !cuadraturaSeleccionada} 
                      onClick={(e) => handleCierre(e, 'cerrar')}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isPending ? 'Cerrando y Actualizando Flota...' : 'Confirmar Recepción y Cerrar Jornada'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* FORMULARIO: NUEVA VUELTA (DESCARGA DE VUELTA N + CARGA DE VUELTA N+1) */}
            {panel === 'nueva_vuelta' && cuadraturaSeleccionada && (
              <form onSubmit={handleCambioDeVuelta} className="p-6 overflow-y-auto space-y-6">
                
                {/* Banner Chofer y Vuelta */}
                <div className="bg-gradient-to-r from-indigo-900 to-[#013299] text-white p-4 rounded-2xl flex justify-between items-center flex-wrap gap-2 shadow-sm">
                  <div>
                    <span className="text-[10px] text-indigo-200 font-black uppercase tracking-wider block">
                      Repartidor y Vehículo
                    </span>
                    <span className="text-base font-black">
                      {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}
                    </span>
                    <span className="text-xs text-indigo-200 font-mono block mt-0.5">
                      Patente: <strong>{cuadraturaSeleccionada.vehiculo?.patente || cuadraturaSeleccionada.usuario?.vehiculo?.patente || 'S/A'}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-200 font-black uppercase tracking-wider block">
                      Transición de Vueltas
                    </span>
                    <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl text-xs font-black">
                      <span>Llegada Vuelta {nvVueltaTermina}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-amber-300">Salida Vuelta {nvVueltaEmpieza}</span>
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* SECCIÓN 1: DESCARGA DEL CAMIÓN (LLEGADA VUELTA N) */}
                {/* ======================================================== */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-amber-200 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                        1
                      </div>
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Descarga del Camión (Llegada Vuelta {nvVueltaTermina})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-white border border-amber-200 px-2.5 py-0.5 rounded-lg">
                      Conteo físico de vacíos y llenos devueltos
                    </span>
                  </div>

                  {/* Odómetro de Llegada */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Km Salida (Vuelta {nvVueltaTermina})</label>
                      <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
                        {nvKmSalidaAnterior} km
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-amber-900 uppercase">Km Llegada (Odómetro) *</label>
                      <input 
                        type="number" 
                        min="0"
                        required 
                        value={nvKmFinal} 
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={e => setNvKmFinal(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="Ej: 145250"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Recorrido Vuelta {nvVueltaTermina}</label>
                      <div className="px-3 py-2 bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-mono font-black text-amber-950">
                        {Number(nvKmFinal) >= nvKmSalidaAnterior && nvKmSalidaAnterior > 0 
                          ? `${Number(nvKmFinal) - nvKmSalidaAnterior} km` 
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Llenos que vuelven en el camión */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                      Productos que vuelven LLENOS en el camión (no vendidos)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {productos.map(p => (
                        <div key={p.id} className="bg-white border border-amber-200 p-2.5 rounded-xl flex items-center justify-between shadow-2xs">
                          <span className="text-xs font-semibold text-slate-800 truncate pr-1" title={p.nombre}>{p.nombre}</span>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="0" 
                            value={nvRetornoLlenos[p.id] === undefined ? '' : nvRetornoLlenos[p.id]} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const val = e.target.value;
                              setNvRetornoLlenos(prev => ({ 
                                ...prev, 
                                [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                              }));
                            }} 
                            className="w-16 px-2 py-1 bg-amber-50/40 border border-amber-300 rounded-lg text-xs text-center font-mono font-bold text-amber-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vacíos totales y Efectivo de la vuelta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-blue-900 uppercase">Envases Vacíos Recibidos *</label>
                        {nvResumenRuta?.cantidades_ruta?.vacios_esperados !== undefined && (
                          <span className="text-[10px] text-blue-700 font-semibold">
                            Esperados: {nvResumenRuta.cantidades_ruta.vacios_esperados}
                          </span>
                        )}
                      </div>
                      <input 
                        type="number" 
                        min="0" 
                        required
                        value={nvVaciosTot === undefined ? '' : nvVaciosTot} 
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={e => {
                          const val = e.target.value;
                          setNvVaciosTot(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                        }} 
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono text-center font-black text-blue-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-400/20" 
                        placeholder="0" 
                      />
                    </div>

                    <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Rendición de Dinero
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        El dinero de ventas no se rinde entre vueltas. El chofer entregará el efectivo, tarjetas y transferencias en el <strong>Cierre Final del Día</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Vacíos Dañados / Rotos */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <label className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Envases Dañados / Rotos de la Vuelta (Baja de Stock)
                      </label>
                      <span className="text-[11px] font-black text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-lg">
                        Total rotos: {nvTotalDanados} un.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {productos.map(p => (
                        <div key={p.id} className="bg-white border border-rose-200 p-2 rounded-xl flex items-center justify-between shadow-2xs">
                          <span className="text-xs font-bold text-slate-700 truncate pr-1" title={p.nombre}>{p.nombre}</span>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="0" 
                            value={nvDanadosDetalle[p.id] === undefined ? '' : nvDanadosDetalle[p.id]} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const val = e.target.value;
                              setNvDanadosDetalle(prev => ({ 
                                ...prev, 
                                [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                              }));
                            }} 
                            className="w-16 px-2 py-1 bg-rose-50/50 border border-rose-300 rounded-lg text-xs text-center font-mono font-black text-rose-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-rose-400/20" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accesorios que vuelven */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Accesorios / Bombas que Retornaron a Fábrica (Opcional)</label>
                    <input 
                      type="text" 
                      value={nvOtrosRetorno} 
                      onChange={e => setNvOtrosRetorno(e.target.value)} 
                      placeholder="Ej: Volvió 1 bomba USB, 1 dispensador sobremesa..." 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500" 
                    />
                  </div>
                </div>

                {/* ======================================================== */}
                {/* SECCIÓN 2: CARGA DEL CAMIÓN (SALIDA VUELTA N+1) */}
                {/* ======================================================== */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-blue-200 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#013299] text-white flex items-center justify-center font-black text-xs">
                        2
                      </div>
                      <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                        Carga del Camión (Salida Vuelta {nvVueltaEmpieza})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-800 bg-white border border-blue-200 px-2.5 py-0.5 rounded-lg font-mono">
                      Odómetro Salida: {nvKmFinal || '—'} km
                    </span>
                  </div>

                  {/* Cantidades a cargar para la nueva vuelta */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-2">
                      Cantidades de Productos a Cargar para la Vuelta {nvVueltaEmpieza} *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {productos.map(p => (
                        <div key={p.id} className="bg-white border border-blue-200 p-3 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                          <span className="text-xs font-semibold text-slate-800 truncate" title={p.nombre}>{p.nombre}</span>
                          <input 
                            type="number" 
                            min="0" 
                            placeholder="0" 
                            value={nvItemsSalida[p.id] === undefined ? '' : nvItemsSalida[p.id]} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const val = e.target.value;
                              setNvItemsSalida(prev => ({ 
                                ...prev, 
                                [p.id]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0) 
                              }));
                            }} 
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono font-bold focus:border-[#013299] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accesorios llevados */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Bombas, Dispensadores u Otros Accesorios que se lleva (Opcional)</label>
                    <input 
                      type="text" 
                      value={nvOtrosSalida} 
                      onChange={e => setNvOtrosSalida(e.target.value)} 
                      placeholder="Ej: 2 Bombas USB para clientes nuevos..." 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#013299]" 
                    />
                  </div>

                  {/* Combustible opcional */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-blue-100">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-blue-200 hover:bg-blue-50/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={nvCombustible.habilitar} 
                        onChange={e => setNvCombustible(prev => ({ ...prev, habilitar: e.target.checked }))} 
                        className="w-4 h-4 text-[#013299] rounded" 
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Fuel className="w-4 h-4 text-amber-500" /> ¿Cargó Combustible antes de salir a la Vuelta {nvVueltaEmpieza}?
                      </span>
                    </label>

                    {nvCombustible.habilitar && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-blue-200">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                          <select 
                            value={nvCombustible.tipo} 
                            onChange={e => setNvCombustible(prev => ({ ...prev, tipo: e.target.value }))} 
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="DIESEL">Diesel</option>
                            <option value="BENCINA">Bencina</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Monto ($) *</label>
                          <input 
                            type="number" 
                            required 
                            min="1" 
                            value={nvCombustible.monto} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => setNvCombustible(prev => ({ ...prev, monto: e.target.value }))} 
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            placeholder="Ej: 20000" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Litros (Opcional)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={nvCombustible.litros} 
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={e => setNvCombustible(prev => ({ ...prev, litros: e.target.value }))} 
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            placeholder="Ej: 19.5" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Factura / Boleta</label>
                          <input 
                            type="text" 
                            value={nvCombustible.factura} 
                            onChange={e => setNvCombustible(prev => ({ ...prev, factura: e.target.value }))} 
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                            placeholder="Ej: 88512" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2 flex-wrap">
                  <button 
                    type="button" 
                    onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); setNvResumenRuta(null); }} 
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button 
                    type="submit" 
                    disabled={isPending} 
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                    {isPending 
                      ? 'Procesando Descarga y Despacho...' 
                      : `Confirmar Descarga de Vuelta ${nvVueltaTermina} y Despachar Vuelta ${nvVueltaEmpieza}`
                    }
                  </button>
                </div>
              </form>
            )}

            {/* FORMULARIO 3: REAPERTURA */}
            {panel === 'reabrir' && (
              <form onSubmit={handleReabrir} className="p-6 overflow-y-auto space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ruta / Repartidor a Reabrir *</label>
                  {cuadraturaSeleccionada ? (
                    <div className="border border-amber-300 bg-amber-50/70 p-3.5 rounded-xl font-bold text-amber-900 flex justify-between items-center text-xs">
                      <span>{new Date(cuadraturaSeleccionada.fecha).toLocaleDateString('es-CL')} - {cuadraturaSeleccionada.usuario?.nombre} {cuadraturaSeleccionada.usuario?.apellido || ''}</span>
                      <Unlock className="h-5 w-5 text-amber-600" />
                    </div>
                  ) : (
                    <select required value={cuadraturaSeleccionada?.id || ''} onChange={e => setCuadraturaSeleccionada(historial.find(c => c.id === e.target.value))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                      <option value="">— Selecciona la ruta a reabrir —</option>
                      {historial.filter(c => c.estado === 'CERRADA').map(c => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.fecha).toLocaleDateString('es-CL')} - {c.usuario?.nombre} {c.usuario?.apellido || ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Motivo de Reapertura (Obligatorio) *</label>
                  <textarea 
                    required 
                    rows={3} 
                    placeholder="Ej: Faltó registrar pago de bencina, error en conteo..." 
                    value={reabrirMotivo} 
                    onChange={e => setReobrirMotivo(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 transition-all resize-none" 
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setPanel(null); setCuadraturaSeleccionada(null); }} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">{isPending ? 'Procesando...' : 'Reabrir para Edición'}</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
