'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  crearVehiculoAction, 
  editarVehiculoAction, 
  registrarMantencionAction, 
  crearAlertaVehiculoAction,
  modificarAlertaAction,
  eliminarAlertaAction,
  VehiculoInput,
  registrarCargaCombustibleAction
} from './actions';

interface VehicleManagerProps {
  initialVehiculos: any[];
}

export default function VehicleManager({ initialVehiculos }: VehicleManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'historial' | 'nueva-mantencion' | 'alertas' | 'combustible'>('historial');

  const vehiculoSeleccionado = initialVehiculos.find(v => v.id === vehiculoSeleccionadoId) || null;

  // Modales y Formularios de Vehículo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [editandoVehiculoId, setEditandoVehiculoId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehiculoInput>({
    patente: '', marca: '', modelo: '', anio: 2026, kilometraje_actual: 0, estado: 'ACTIVO'
  });

  // Formulario Mantención
  const [mantencionForm, setMantencionForm] = useState({
    tipo: 'PREVENTIVA', kilometraje: '', mano_de_obra: '', taller: '', observaciones: '', fecha: new Date().toISOString().split('T')[0]
  });
  const [repuestosList, setRepuestosList] = useState<{ nombre: string; cantidad: number; costo_unitario: number }[]>([]);
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: '', cantidad: 1, costo_unitario: '' });

  // Formulario Alertas
  const [alertaForm, setAlertaForm] = useState({ tipo: 'KM', valor_km: '', fecha_alerta: '' });
  const [editandoAlertaId, setEditandoAlertaId] = useState<string | null>(null);

  // Formulario Combustible
  const [combustibleForm, setCombustibleForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    kilometraje: '',
    litros: '',
    monto: '',
    bencinera: 'Copec',
    numero_factura: '' 
  });

  const [busquedaCombustible, setBusquedaCombustible] = useState('');
  const [paginaActualCombustible, setPaginaActualCombustible] = useState(1);
  
  const [busquedaMantencion, setBusquedaMantencion] = useState('');
  const [paginaActualMantencion, setPaginaActualMantencion] = useState(1);
  
  const itemsPorPagina = 10;

  // 📥 Funciones de Exportación de Datos a CSV (Excel)
  const exportarCombustibleCSV = () => {
    if (!vehiculoSeleccionado) return;
    const cargas = vehiculoSeleccionado.cargas_combustible || vehiculoSeleccionado.cargasCombustible || [];
    if (cargas.length === 0) return alert('No hay registros de combustible para exportar.');

    const headers = ['Fecha', 'Patente', 'Estacion_Bencinera', 'Numero_Factura', 'Odometro_KM', 'Litros', 'Monto_Total_CLP'];
    const rows = cargas.map((c: any) => [
      c.fecha ? new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '',
      vehiculoSeleccionado.patente,
      `"${c.taller_o_bencinera || c.bencinera || 'Estación'}"`,
      c.numero_factura || '',
      c.kilometraje || 0,
      c.litros || 0,
      c.monto || 0
    ]);

    const csvContent = [headers.join(';'), ...rows.map((e: any[]) => e.join(';'))].join('\n');
    descargarArchivoCSV(csvContent, `combustible_${vehiculoSeleccionado.patente}.csv`);
  };

  const exportarMantencionesCSV = () => {
    if (!vehiculoSeleccionado) return;
    const mantenciones = vehiculoSeleccionado.mantenciones || [];
    if (mantenciones.length === 0) return alert('No hay registros de taller para exportar.');

    const headers = ['Fecha', 'Patente', 'Tipo_Mantencion', 'Taller', 'Odometro_KM', 'Costo_Total_CLP', 'Observaciones'];
    const rows = mantenciones.map((m: any) => [
      m.fecha ? new Date(m.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '',
      vehiculoSeleccionado.patente,
      m.tipo,
      `"${m.taller || ''}"`,
      m.kilometraje || 0,
      m.costo_total || 0,
      `"${(m.observaciones || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(';'), ...rows.map((e: any[]) => e.join(';'))].join('\n');
    descargarArchivoCSV(csvContent, `taller_${vehiculoSeleccionado.patente}.csv`);
  };

  const descargarArchivoCSV = (content: string, fileName: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCreate = () => {
    setErrorForm(null);
    setEditandoVehiculoId(null);
    setVehicleForm({ patente: '', marca: '', modelo: '', anio: 2026, kilometraje_actual: 0, estado: 'ACTIVO' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehiculo: any) => {
    setErrorForm(null);
    setEditandoVehiculoId(vehiculo.id);
    setVehicleForm({
      patente: vehiculo.patente, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio, kilometraje_actual: vehiculo.kilometraje_actual, estado: vehiculo.estado
    });
    setIsModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      let res = editandoVehiculoId ? await editarVehiculoAction(editandoVehiculoId, vehicleForm) : await crearVehiculoAction(vehicleForm);
      if (res.success) {
        setIsModalOpen(false);
        setEditandoVehiculoId(null);
        router.refresh();
      } else { setErrorForm(res.message); }
    });
  };

  const handleCambiarEstadoVehiculo = async (id: string, nuevoEstado: 'ACTIVO' | 'EN_MANTENCION' | 'FUERA_DE_SERVICIO') => {
    const res = await editarVehiculoAction(id, { estado: nuevoEstado });
    if (res.success) {
      router.refresh();
    }
  };

  const agregarRepuestoALista = () => {
    if (!nuevoRepuesto.nombre.trim() || !nuevoRepuesto.costo_unitario) return;
    setRepuestosList([...repuestosList, { nombre: nuevoRepuesto.nombre, cantidad: Number(nuevoRepuesto.cantidad), costo_unitario: Number(nuevoRepuesto.costo_unitario) }]);
    setNuevoRepuesto({ nombre: '', cantidad: 1, costo_unitario: '' });
  };

  const handleGuardarMantencion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;
    const payload = {
      vehiculo_id: vehiculoSeleccionado.id, fecha: mantencionForm.fecha, tipo: mantencionForm.tipo, kilometraje: Number(mantencionForm.kilometraje), mano_de_obra: Number(mantencionForm.mano_de_obra) || 0, taller: mantencionForm.taller, observaciones: mantencionForm.observaciones, repuestos: repuestosList
    };
    const res = await registrarMantencionAction(payload);
    if (res.success) {
      setMantencionForm({ tipo: 'PREVENTIVA', kilometraje: '', mano_de_obra: '', taller: '', observaciones: '', fecha: new Date().toISOString().split('T')[0] });
      setRepuestosList([]);
      setPaginaActualMantencion(1);
      router.refresh();
    }
  };

  const handleGuardarAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;

    startTransition(async () => {
      let res;
      if (editandoAlertaId) {
        res = await modificarAlertaAction(editandoAlertaId, {
          tipo: alertaForm.tipo as 'KM' | 'FECHA',
          valor_km: alertaForm.valor_km ? Number(alertaForm.valor_km) : undefined,
          fecha_alerta: alertaForm.fecha_alerta || undefined
        });
      } else {
        res = await crearAlertaVehiculoAction(
          vehiculoSeleccionado.id,
          alertaForm.tipo as 'KM' | 'FECHA',
          alertaForm.valor_km ? Number(alertaForm.valor_km) : undefined,
          alertaForm.fecha_alerta || undefined
        );
      }

      if (res.success) {
        setAlertaForm({ tipo: 'KM', valor_km: '', fecha_alerta: '' });
        setEditandoAlertaId(null);
        router.refresh();
      }
    });
  };

  const handleIniciarEdicionAlerta = (alerta: any) => {
    setEditandoAlertaId(alerta.id);
    setAlertaForm({
      tipo: alerta.tipo,
      valor_km: alerta.valor_km ? String(alerta.valor_km) : '',
      fecha_alerta: alerta.fecha_alerta ? new Date(alerta.fecha_alerta).toISOString().split('T')[0] : ''
    });
  };

  const handleQuitarAlerta = async (alertaId: string) => {
    if (confirm('¿Seguro que deseas eliminar permanentemente este recordatorio técnico?')) {
      const res = await eliminarAlertaAction(alertaId);
      if (res.success) {
        router.refresh();
        if (editandoAlertaId === alertaId) {
          setEditandoAlertaId(null);
          setAlertaForm({ tipo: 'KM', valor_km: '', fecha_alerta: '' });
        }
      }
    }
  };

  const handleGuardarCombustible = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return;

    const res = await registrarCargaCombustibleAction({
      vehiculo_id: vehiculoSeleccionado.id,
      fecha: combustibleForm.fecha,
      kilometraje: Number(combustibleForm.kilometraje),
      litros: Number(combustibleForm.litros),
      monto: Number(combustibleForm.monto),
      taller_o_bencinera: combustibleForm.bencinera,
      numero_factura: Number(combustibleForm.numero_factura)
    });

    if (res.success) {
      setCombustibleForm({
        fecha: new Date().toISOString().split('T')[0],
        kilometraje: '',
        litros: '',
        monto: '',
        bencinera: 'Copec',
        numero_factura: ''
      });
      setPaginaActualCombustible(1); 
      router.refresh();
    }
  };

  return (
    <div className="px-6 pb-6 pt-6 flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center pt-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Flota y Vehículos</h1>
          <p className="text-sm text-slate-500">Supervisión técnica, kilometrajes y alertas de mantenimiento para camiones distribuidores Sodatal.</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
          + Registrar Vehículo
        </button>
      </div>

      {/* Grid de Vehículos Saneado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {initialVehiculos.map((vehiculo) => {
          
          const tieneAlertas = vehiculo.alertas?.some((a: any) => {
            if (a.estado === 'RESUELTA' || a.activa === false) return false;
            
            if (a.tipo === 'KM') {
              return Number(vehiculo.kilometraje_actual) >= Number(a.valor_km);
            }
            
            if (a.tipo === 'FECHA') {
              const fechaAlerta = new Date(a.fecha_alerta).setHours(0,0,0,0);
              const hoy = new Date().setHours(0,0,0,0);
              return hoy >= fechaAlerta;
            }
            return false;
          });

          const totalCargas = vehiculo.cargas_combustible?.length || vehiculo.cargasCombustible?.length || 0;

          return (
            <div key={vehiculo.id} className={`bg-white border rounded-xl p-5 shadow-xs relative flex flex-col justify-between space-y-4 ${
              tieneAlertas ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'
            }`}>
              
              {tieneAlertas && (
                <span className="absolute top-3 right-3 text-lg animate-bounce" title="¡Alerta técnica alcanzada o vencida!">⚠️</span>
              )}
              
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white font-mono font-bold tracking-wider px-2 py-0.5 rounded text-sm border-2 border-slate-700 shadow-xs">
                      {vehiculo.patente}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      vehiculo.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 
                      vehiculo.estado === 'EN_MANTENCION' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {vehiculo.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <button onClick={() => handleOpenEdit(vehiculo)} className="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded">
                    ✏️ Editar
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 mt-2 text-base">{vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio})</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">📊 Odómetro: <b className="text-slate-800">{Number(vehiculo.kilometraje_actual).toLocaleString('es-CL')} km</b></p>
              </div>

              <div className="pt-2 border-t flex items-center justify-between gap-1">
                <select 
                  value={vehiculo.estado} 
                  onChange={(e) => handleCambiarEstadoVehiculo(vehiculo.id, e.target.value as any)}
                  className="border border-slate-200 text-xs rounded p-1 bg-white text-slate-700 outline-none font-medium"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_MANTENCION">En Mantención</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
                </select>
                
                <button 
                  onClick={() => { 
                    setVehiculoSeleccionadoId(vehiculo.id); 
                    setActiveTab('historial'); 
                    setEditandoAlertaId(null); 
                    setAlertaForm({ tipo: 'KM', valor_km: '', fecha_alerta: '' });
                    setBusquedaCombustible(''); 
                    setBusquedaMantencion('');
                    setPaginaActualCombustible(1); 
                    setPaginaActualMantencion(1);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  🔧 Taller ({vehiculo.mantenciones?.length || 0}) | ⛽ ({totalCargas})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Alta/Edición de Vehículo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveVehicle} className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">
              {editandoVehiculoId ? `Modificar Unidad: ${vehicleForm.patente}` : 'Registrar Unidad Logística'}
            </h2>
            {errorForm && <div className="text-xs bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded">{errorForm}</div>}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-600">Patente *</label>
                <input type="text" required disabled={!!editandoVehiculoId} placeholder="ABCD12" value={vehicleForm.patente} onChange={(e) => setVehicleForm({...vehicleForm, patente: e.target.value})} className="border p-2 rounded text-sm uppercase font-mono bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-600">Año *</label>
                <input type="number" required value={vehicleForm.anio} onChange={(e) => setVehicleForm({...vehicleForm, anio: Number(e.target.value)})} className="border p-2 rounded text-sm bg-white text-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-600">Marca *</label>
                <input type="text" required placeholder="Hyundai" value={vehicleForm.marca} onChange={(e) => setVehicleForm({...vehicleForm, marca: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-600">Modelo *</label>
                <input type="text" required placeholder="HD78" value={vehicleForm.modelo} onChange={(e) => setVehicleForm({...vehicleForm, modelo: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-slate-600">Kilometraje Actual *</label>
              <input type="number" required placeholder="0" value={vehicleForm.kilometraje_actual} onChange={(e) => setVehicleForm({...vehicleForm, kilometraje_actual: Number(e.target.value)})} className="border p-2 rounded text-sm bg-white text-slate-900" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setIsModalOpen(false); setEditandoVehiculoId(null); }} className="text-xs text-slate-500 px-3 py-2">Cancelar</button>
              <button type="submit" disabled={isPending} className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-lg">
                {editandoVehiculoId ? 'Actualizar Cambios' : 'Guardar Vehículo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sidebar de Bitácora y Mantención */}
      {vehiculoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-40">
          <div className="bg-white w-full max-w-xl h-screen shadow-2xl flex flex-col border-l">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Panel Técnico Flota</span>
                <h2 className="text-lg font-bold font-mono text-white">{vehiculoSeleccionado.patente} — {vehiculoSeleccionado.marca}</h2>
              </div>
              <button onClick={() => setVehiculoSeleccionadoId(null)} className="text-white text-2xl font-semibold">&times;</button>
            </div>

            <div className="flex border-b text-xs font-bold bg-slate-50 overflow-x-auto">
              <button onClick={() => { setActiveTab('historial'); setPaginaActualMantencion(1); }} className={`flex-1 py-3 px-2 text-center whitespace-nowrap ${activeTab === 'historial' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>🛠️ Historial</button>
              <button onClick={() => setActiveTab('nueva-mantencion')} className={`flex-1 py-3 px-2 text-center whitespace-nowrap ${activeTab === 'nueva-mantencion' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>➕ Registrar Taller</button>
              <button onClick={() => { setActiveTab('combustible'); setPaginaActualCombustible(1); }} className={`flex-1 py-3 px-2 text-center whitespace-nowrap ${activeTab === 'combustible' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>⛽ Combustible</button>
              <button onClick={() => setActiveTab('alertas')} className={`flex-1 py-3 px-2 text-center whitespace-nowrap ${activeTab === 'alertas' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>⏰ Alertas</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* HISTORIAL (PAGINADO Y FILTRADO) */}
              {activeTab === 'historial' && (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text"
                      placeholder="🔍 Buscar por Taller, Repuesto, Tipo..."
                      value={busquedaMantencion}
                      onChange={(e) => {
                        setBusquedaMantencion(e.target.value);
                        setPaginaActualMantencion(1);
                      }}
                      className="flex-1 border p-2 rounded-lg text-xs bg-white text-slate-900 border-slate-300 shadow-inner outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={exportarMantencionesCSV}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                      title="Exportar bitácora de taller a Excel"
                    >
                      📊 Excel
                    </button>
                  </div>

                  {(() => {
                    const listaMantencionesOriginal = vehiculoSeleccionado.mantenciones || [];

                    if (listaMantencionesOriginal.length === 0) {
                      return <p className="text-xs text-slate-400 text-center py-8">Este camión no registra pasos por taller.</p>;
                    }

                    const mantencionesOrdenadas = listaMantencionesOriginal
                      .slice()
                      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                    const mantencionesFiltradas = mantencionesOrdenadas.filter((m: any) => {
                      const taller = (m.taller || "").toLowerCase();
                      const observaciones = (m.observaciones || "").toLowerCase();
                      const tipo = (m.tipo || "").toLowerCase();
                      const termino = busquedaMantencion.toLowerCase();
                      
                      const trackingRepuestos = m.repuestos?.some((r: any) => 
                        r.nombre?.toLowerCase().includes(termino)
                      ) || false;

                      return taller.includes(termino) || observaciones.includes(termino) || tipo.includes(termino) || trackingRepuestos;
                    });

                    if (mantencionesFiltradas.length === 0) {
                      return (
                        <p className="text-center text-xs text-slate-400 italic py-4">
                          Ninguna mantención coincide con "{busquedaMantencion}".
                        </p>
                      );
                    }

                    const totalItems = mantencionesFiltradas.length;
                    const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
                    const indiceInicial = (paginaActualMantencion - 1) * itemsPorPagina;
                    const mantencionesPaginadas = mantencionesFiltradas.slice(indiceInicial, indiceInicial + itemsPorPagina);

                    return (
                      <>
                        {mantencionesPaginadas.map((m: any) => (
                          <div key={m.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2 shadow-xs">
                            <div className="flex justify-between items-center border-b pb-1">
                              <span className="font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded uppercase">{m.tipo}</span>
                              <span className="text-slate-500 font-medium">{new Date(m.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</span>
                            </div>
                            <p className="text-slate-700 font-medium">🏢 Taller: <b>{m.taller}</b> | Odómetro: {Number(m.kilometraje).toLocaleString('es-CL')} km</p>
                            
                            {m.repuestos && m.repuestos.length > 0 && (
                              <div className="bg-white p-2 rounded border border-slate-200 mt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Repuestos/Insumos:</span>
                                <ul className="space-y-0.5 divide-y divide-slate-100">
                                  {m.repuestos.map((rep: any, idx: number) => (
                                    <li key={idx} className="text-slate-600 flex justify-between text-[11px] pt-0.5">
                                      <span>🔧 {rep.nombre} (x{rep.cantidad})</span>
                                      <span className="text-slate-500">${Number(rep.costo_unitario * rep.cantidad).toLocaleString('es-CL')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {m.observaciones && <p className="text-slate-500 italic mt-1">"{m.observaciones}"</p>}
                            <div className="text-right font-bold text-slate-900 pt-1 text-sm">Costo Total: ${Number(m.costo_total).toLocaleString('es-CL')}</div>
                          </div>
                        ))}

                        {totalPaginas > 1 && (
                          <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-100 bg-white">
                            <button
                              type="button"
                              disabled={paginaActualMantencion === 1}
                              onClick={() => setPaginaActualMantencion(prev => prev - 1)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded font-bold transition-colors"
                            >
                              ◀ Anterior
                            </button>
                            <span className="text-slate-500 text-xs font-medium">
                              Pág. <b>{paginaActualMantencion}</b> de {totalPaginas}
                            </span>
                            <button
                              type="button"
                              disabled={paginaActualMantencion === totalPaginas}
                              onClick={() => setPaginaActualMantencion(prev => prev + 1)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded font-bold transition-colors"
                            >
                              Siguiente ▶
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* NUEVA MANTENCIÓN */}
              {activeTab === 'nueva-mantencion' && (
                <form onSubmit={handleGuardarMantencion} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 uppercase">Tipo</label>
                      <select value={mantencionForm.tipo} onChange={(e) => setMantencionForm({...mantencionForm, tipo: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900">
                        <option value="PREVENTIVA">Preventiva </option>
                        <option value="CORRECTIVA">Correctiva </option>
                        <option value="NEUMATICOS">Cambio de Neumáticos</option>
                        <option value="LEGAL">Revisión Técnica / Seguro</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 uppercase">Fecha Órden</label>
                      <input type="date" value={mantencionForm.fecha} onChange={(e) => setMantencionForm({...mantencionForm, fecha: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 uppercase">Kilometraje en Taller</label>
                      <input type="number" required placeholder="Ej: 145000" value={mantencionForm.kilometraje} onChange={(e) => setMantencionForm({...mantencionForm, kilometraje: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 uppercase">Mano de Obra ($)</label>
                      <input type="number" required placeholder="Monto mecánico" value={mantencionForm.mano_de_obra} onChange={(e) => setMantencionForm({...mantencionForm, mano_de_obra: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 uppercase">Nombre Taller Técnico</label>
                    <input type="text" required placeholder="Ej: Servicentro Central" value={mantencionForm.taller} onChange={(e) => setMantencionForm({...mantencionForm, taller: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                  </div>
                  <div className="border p-3 rounded-xl bg-slate-50 space-y-2">
                    <h4 className="font-bold text-slate-800">Desglose de Repuestos e Insumos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Filtro" value={nuevoRepuesto.nombre} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, nombre: e.target.value})} className="border p-1.5 rounded text-xs bg-white text-slate-900 col-span-1" />
                      <input type="number" placeholder="Cant" value={nuevoRepuesto.cantidad} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, cantidad: Number(e.target.value)})} className="border p-1.5 rounded text-xs bg-white text-slate-900" />
                      <button type="button" onClick={agregarRepuestoALista} className="bg-slate-900 text-white font-bold rounded text-xs px-2 hover:bg-slate-800">Agregar</button>
                    </div>
                    <input type="number" placeholder="Costo Unitario ($)" value={nuevoRepuesto.costo_unitario} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, costo_unitario: e.target.value})} className="border p-1.5 rounded text-xs bg-white text-slate-900 w-full" />
                    
                    {repuestosList.length > 0 && (
                      <ul className="mt-2 space-y-1 bg-white p-2 rounded border text-[11px]">
                        {repuestosList.map((r, i) => (
                          <li key={i} className="flex justify-between text-slate-600 font-medium">
                            <span>📦 {r.nombre} (x{r.cantidad})</span>
                            <span>${(r.costo_unitario * r.cantidad).toLocaleString('es-CL')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 uppercase">Observaciones</label>
                    <textarea rows={3} value={mantencionForm.observaciones || mantencionForm.observaciones} onChange={(e) => setMantencionForm({...mantencionForm, observaciones: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm">Guardar Registro</button>
                </form>
              )}

              {/* PESTAÑA COMBUSTIBLE */}
              {activeTab === 'combustible' && (
                <div className="space-y-4">
                  <form onSubmit={handleGuardarCombustible} className="border-2 border-amber-500/20 p-4 rounded-xl bg-amber-50/40 space-y-3 text-xs">
                    <h3 className="font-bold text-amber-800 flex items-center gap-1 uppercase tracking-wider text-[11px]">⛽ Registrar Carga de Combustible</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700 uppercase">Fecha Carga</label>
                        <input type="date" required value={combustibleForm.fecha} onChange={(e) => setCombustibleForm({...combustibleForm, fecha: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700 uppercase">Estación / Bencinera</label>
                        <input type="text" required placeholder="Copec" value={combustibleForm.bencinera} onChange={(e) => setCombustibleForm({...combustibleForm, bencinera: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-700 uppercase">N° Factura *</label>
                      <input type="number" required placeholder="Ej: 148920" value={combustibleForm.numero_factura} onChange={(e) => setCombustibleForm({...combustibleForm, numero_factura: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">Odómetro (KM)</label>
                        <input type="number" required placeholder="Ej: 180500" value={combustibleForm.kilometraje} onChange={(e) => setCombustibleForm({...combustibleForm, kilometraje: e.target.value})} className="border p-1.5 rounded text-sm bg-white text-slate-900" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">Litros (L)</label>
                        <input type="number" step="any" required placeholder="Ej: 45.5" value={combustibleForm.litros} onChange={(e) => setCombustibleForm({...combustibleForm, litros: e.target.value})} className="border p-1.5 rounded text-sm bg-white text-slate-900" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">Total Pesos ($)</label>
                        <input type="number" required placeholder="Ej: 55000" value={combustibleForm.monto} onChange={(e) => setCombustibleForm({...combustibleForm, monto: e.target.value})} className="border p-1.5 rounded text-sm bg-white text-slate-900" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs uppercase tracking-wider text-[11px]">Guardar Carga de Petróleo</button>
                  </form>

                  <div className="border-t pt-2 space-y-2">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Historial de Consumo</h4>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text"
                        placeholder="🔍 Buscar por Copec, Shell, Factura..."
                        value={busquedaCombustible}
                        onChange={(e) => {
                          setBusquedaCombustible(e.target.value);
                          setPaginaActualCombustible(1);
                        }}
                        className="flex-1 border p-2 rounded-lg text-xs bg-white text-slate-900 border-slate-300 shadow-inner outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={exportarCombustibleCSV}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        title="Exportar cargas de combustible a Excel"
                      >
                        📊 Excel
                      </button>
                    </div>

                    {(() => {
                      const cargasCombustible = vehiculoSeleccionado.cargas_combustible || vehiculoSeleccionado.cargasCombustible || [];

                      if (cargasCombustible.length === 0) {
                        return <p className="text-xs text-slate-400 italic text-center py-4">No hay cargas ingresadas.</p>;
                      }

                      const cargasOrdenadas = cargasCombustible
                        .slice()
                        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                      const cargasFiltradas = cargasOrdenadas.filter((c: any) => {
                        const termino = busquedaCombustible.toLowerCase();
                        const bencinera = (c.taller_o_bencinera || c.bencinera || "").toLowerCase();
                        const factura = String(c.numero_factura || "");
                        return bencinera.includes(termino) || factura.includes(termino);
                      });

                      if (cargasFiltradas.length === 0) {
                        return (
                          <p className="text-center text-xs text-slate-400 italic py-2">
                            Ninguna carga coincide con "{busquedaCombustible}".
                          </p>
                        );
                      }

                      const totalCargasFiltradas = cargasFiltradas.length;
                      const paginasCombustible = Math.ceil(totalCargasFiltradas / itemsPorPagina);
                      const initIdx = (paginaActualCombustible - 1) * itemsPorPagina;
                      const cargasPaginadas = cargasFiltradas.slice(initIdx, initIdx + itemsPorPagina);

                      return (
                        <>
                          <div className="space-y-2">
                            {cargasPaginadas.map((c: any, index: number) => {
                              const cargaGlobalIndex = cargasOrdenadas.findIndex((orig: any) => orig.id === c.id);
                              const siguienteCarga = cargasOrdenadas[cargaGlobalIndex + 1];
                              
                              let rendimientoText = "Calculando en próxima carga...";
                              let esRendimientoValido = false;

                              if (siguienteCarga) {
                                const diffKm = Number(c.kilometraje) - Number(siguienteCarga.kilometraje);
                                const litros = Number(c.litros);
                                if (diffKm > 0 && litros > 0) {
                                  rendimientoText = `Rendimiento: ${(diffKm / litros).toFixed(2)} km/L`;
                                  esRendimientoValido = true;
                                }
                              }

                              return (
                                <div key={c.id} className="border rounded-xl p-3 bg-white text-xs space-y-1 shadow-xs border-slate-200">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                      <b className="text-slate-800">{new Date(c.fecha).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</b>
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                        {c.taller_o_bencinera || c.bencinera}
                                      </span>
                                      {c.numero_factura && (
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-blue-200">
                                          F: N° {c.numero_factura}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-slate-500 font-medium">
                                    {Number(c.litros).toLocaleString('es-CL')} L por <b className="text-slate-700">${Number(c.monto).toLocaleString('es-CL')}</b> | {Number(c.kilometraje).toLocaleString('es-CL')} km
                                  </p>
                                  <p className={`text-[11px] font-bold ${esRendimientoValido ? 'text-emerald-600' : 'text-slate-400 italic font-medium'}`}>
                                    {esRendimientoValido ? '📈 ' : ''}{rendimientoText}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {paginasCombustible > 1 && (
                            <div className="flex justify-between items-center pt-3 mt-4 border-t border-slate-100 bg-white">
                              <button
                                type="button"
                                disabled={paginaActualCombustible === 1}
                                onClick={() => setPaginaActualCombustible(prev => prev - 1)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded font-bold transition-colors"
                              >
                                ◀ Anterior
                              </button>
                              <span className="text-slate-500 text-xs font-medium">
                                Página <b>{paginaActualCombustible}</b> de {paginasCombustible}
                              </span>
                              <button
                                type="button"
                                disabled={paginaActualCombustible === paginasCombustible}
                                onClick={() => setPaginaActualCombustible(prev => prev + 1)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded font-bold transition-colors"
                              >
                                Siguiente ▶
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* CONFIGURACIÓN DE ALERTAS */}
              {activeTab === 'alertas' && (
                <div className="space-y-4 text-xs">
                  <form onSubmit={handleGuardarAlerta} className="border-2 border-blue-600/10 p-4 rounded-xl bg-blue-50/30 space-y-3">
                    <h3 className="font-bold text-blue-900 flex items-center gap-1 uppercase tracking-wider text-[11px]">⏰ Configurar Recordatorio</h3>
                    <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
                      <button type="button" onClick={() => setAlertaForm({...alertaForm, tipo: 'KM'})} className={`py-1.5 text-center font-bold rounded-md transition-colors ${alertaForm.tipo === 'KM' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Por Kilometraje</button>
                      <button type="button" onClick={() => setAlertaForm({...alertaForm, tipo: 'FECHA'})} className={`py-1.5 text-center font-bold rounded-md transition-colors ${alertaForm.tipo === 'FECHA' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Por Fecha</button>
                    </div>

                    {alertaForm.tipo === 'KM' ? (
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700">¿A QUÉ KILOMETRAJE AVISAR?</label>
                        <input type="number" required placeholder="Ej: 150000" value={alertaForm.valor_km} onChange={(e) => setAlertaForm({...alertaForm, valor_km: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700">¿QUÉ DÍA ENVIAR ADVERTENCIA?</label>
                        <input type="date" required value={alertaForm.fecha_alerta} onChange={(e) => setAlertaForm({...alertaForm, fecha_alerta: e.target.value})} className="border p-2 rounded text-sm bg-white text-slate-900" />
                      </div>
                    )}

                    <button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors shadow-xs">
                      {editandoAlertaId ? 'Actualizar Recordatorio' : 'Activar Recordatorio'}
                    </button>
                  </form>

                  <div className="border-t pt-2 space-y-2">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Recordatorios Configurados</h4>
                    {vehiculoSeleccionado.alertas && vehiculoSeleccionado.alertas.length > 0 ? (
                      <div className="space-y-2">
                        {vehiculoSeleccionado.alertas.map((alerta: any) => {
                          let vencida = false;
                          if (alerta.tipo === 'KM') vencida = Number(vehiculoSeleccionado.kilometraje_actual) >= Number(alerta.valor_km);
                          if (alerta.tipo === 'FECHA') vencida = new Date().setHours(0,0,0,0) >= new Date(alerta.fecha_alerta).setHours(0,0,0,0);

                          return (
                            <div key={alerta.id} className={`border rounded-xl p-3 flex justify-between items-center shadow-xs ${vencida ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                              <div>
                                <p className="font-bold text-slate-800">
                                  {alerta.tipo === 'KM' ? `A los ${Number(alerta.valor_km).toLocaleString('es-CL')} km` : `El ${new Date(alerta.fecha_alerta).toLocaleDateString('es-CL', { timeZone: 'UTC' })}`}
                                </p>
                                <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${vencida ? 'text-rose-600' : 'text-slate-500'}`}>
                                  {vencida ? '🚨 CRÍTICA / VENCIDA' : '⏳ PENDIENTE'}
                                </span>
                              </div>
                              <div className="flex gap-2 text-xs font-bold">
                                <button type="button" onClick={() => handleIniciarEdicionAlerta(alerta)} className="text-blue-600 hover:underline">Editar</button>
                                <button type="button" onClick={() => handleQuitarAlerta(alerta.id)} className="text-rose-600 hover:underline">Eliminar</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-4">Este camión no tiene alertas vigentes.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}