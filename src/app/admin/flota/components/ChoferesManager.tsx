'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  obtenerChoferesAction,
  obtenerVehiculosAction,
  asignarVehiculoPredeterminadoAction,
  actualizarDatosChoferAction
} from '../actions';
import { 
  Users, Phone, Mail, ShieldCheck, Truck, ShieldAlert, 
  ExternalLink, Search, CheckCircle2, UserCheck, AlertCircle 
} from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface Props {
  choferesIniciales: any[];
  vehiculosIniciales?: any[];
}

export default function ChoferesManager({ choferesIniciales, vehiculosIniciales = [] }: Props) {
  const [choferes, setChoferes] = useState(choferesIniciales);
  const [vehiculos, setVehiculos] = useState<any[]>(vehiculosIniciales);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [actualizandoVehiculoId, setActualizandoVehiculoId] = useState<string | null>(null);
  const [actualizandoLicenciaId, setActualizandoLicenciaId] = useState<string | null>(null);
  const { popup, showSuccess, showError, close } = usePopup();

  const refrescarDatos = async () => {
    setCargando(true);
    const [rc, rv] = await Promise.all([
      obtenerChoferesAction(),
      obtenerVehiculosAction(),
    ]);
    if (rc.success) setChoferes(rc.choferes);
    if (rv.success) setVehiculos(rv.vehiculos);
    setCargando(false);
  };

  useEffect(() => {
    if (vehiculosIniciales.length === 0) {
      refrescarDatos();
    }
  }, []);

  const handleCambiarVehiculoPredeterminado = async (choferId: string, vehiculoId: string) => {
    setActualizandoVehiculoId(choferId);
    const res = await asignarVehiculoPredeterminadoAction(choferId, vehiculoId ? vehiculoId : null);
    if (res.success) {
      await refrescarDatos();
      showSuccess(
        'Vehículo Predeterminado Actualizado',
        vehiculoId
          ? 'El vehículo predeterminado ha sido asignado al chofer.'
          : 'Se ha desasignado el vehículo predeterminado del chofer.'
      );
    } else {
      showError('Error al asignar', res.message || 'No se pudo actualizar el vehículo.');
    }
    setActualizandoVehiculoId(null);
  };

  const handleCambiarLicencia = async (choferId: string, nuevaLicencia: string) => {
    setActualizandoLicenciaId(choferId);
    const res = await actualizarDatosChoferAction(choferId, { licencia_tipo: nuevaLicencia });
    if (res.success) {
      await refrescarDatos();
      showSuccess('Licencia Actualizada', `Tipo de licencia actualizado a ${nuevaLicencia}.`);
    } else {
      showError('Error', res.message || 'No se pudo actualizar la licencia.');
    }
    setActualizandoLicenciaId(null);
  };

  // Filtrado de choferes por búsqueda
  const choferesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return choferes;
    const term = busqueda.toLowerCase().trim();
    return choferes.filter((c) => {
      const nom = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
      const rut = (c.rut || '').toLowerCase();
      const mail = (c.email || '').toLowerCase();
      const pat = (c.vehiculo?.patente || '').toLowerCase();
      return nom.includes(term) || rut.includes(term) || mail.includes(term) || pat.includes(term);
    });
  }, [choferes, busqueda]);

  const conVehiculoCount = choferes.filter(c => !!c.vehiculo_id).length;
  const sinVehiculoCount = choferes.length - conVehiculoCount;

  return (
    <div className="space-y-6 font-sans text-slate-900">
      <PopupGlobal popup={popup} onClose={close} />

      {/* ── Banner informativo del flujo de registro ── */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-5 rounded-2xl border border-blue-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#013299] text-white shrink-0 mt-0.5">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#013299] uppercase tracking-wider">
              Flujo de Registro y Activación de Choferes
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Los conductores crean su cuenta directamente desde la pantalla de inicio de sesión (<strong>/login</strong>) con su correo, RUT y clave. Luego, el administrador aprueba su acceso asignándoles el rol <strong>REPARTIDOR</strong> desde el panel de <strong>Roles y Permisos</strong>.
            </p>
          </div>
        </div>
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-2 bg-[#013299] hover:bg-blue-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0"
        >
          <span>Ir a Roles y Permisos</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Tarjeta Principal de Choferes Activos ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl text-white" style={{ backgroundColor: '#013299' }}>
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Choferes y Vehículos Habituales de Reparto
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Personal con rol REPARTIDOR activo para hojas de ruta y despacho
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#013299] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              Total Choferes: <b>{choferes.length}</b>
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Con Camión: <b>{conVehiculoCount}</b>
            </span>
            {sinVehiculoCount > 0 && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                Sin Camión: <b>{sinVehiculoCount}</b>
              </span>
            )}
          </div>
        </div>

        {/* Buscador */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, correo o patente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all"
          />
        </div>

        {cargando && choferes.length === 0 ? (
          <div className="text-center py-12 text-xs font-bold text-slate-400 tracking-widest uppercase">
            Actualizando Choferes...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Conductor</th>
                  <th className="p-3.5">RUT / Contacto</th>
                  <th className="p-3.5">Licencia de Conducir</th>
                  <th className="p-3.5">Vehículo Habitual (Predeterminado)</th>
                  <th className="p-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {choferesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                      {busqueda
                        ? 'No se encontraron choferes que coincidan con la búsqueda.'
                        : 'No hay usuarios con rol REPARTIDOR registrados en el sistema.'}
                    </td>
                  </tr>
                ) : (
                  choferesFiltrados.map((c: any) => {
                    const vehiculoAsignado = c.vehiculo || vehiculos.find((v) => v.id === c.vehiculo_id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Conductor */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: '#013299' }}
                            >
                              {(c.nombre || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {c.nombre} {c.apellido || ''}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{c.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* RUT / Contacto */}
                        <td className="p-3.5 text-slate-600 font-medium">
                          <div className="font-mono text-slate-800 font-bold text-xs">{c.rut}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.telefono || 'Sin teléfono'}</span>
                          </div>
                        </td>

                        {/* Licencia */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={c.licencia_tipo || 'Clase B'}
                              disabled={actualizandoLicenciaId === c.id}
                              onChange={(e) => handleCambiarLicencia(c.id, e.target.value)}
                              className="bg-blue-50/80 text-[#013299] border border-blue-200/80 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none cursor-pointer hover:bg-blue-100 transition-colors disabled:opacity-50"
                              title="Haz clic para modificar el tipo de licencia"
                            >
                              <option value="Clase A4">Clase A4 (Camiones simples)</option>
                              <option value="Clase A5">Clase A5 (Articulados)</option>
                              <option value="Clase B">Clase B (Vehículo particular)</option>
                            </select>
                          </div>
                        </td>

                        {/* Vehículo Habitual */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1.5 min-w-[240px]">
                            {vehiculoAsignado ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit shadow-2xs">
                                <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="font-mono font-bold tracking-wider">[{vehiculoAsignado.patente}]</span>
                                <span className="text-emerald-700">{vehiculoAsignado.marca} {vehiculoAsignado.modelo}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 w-fit">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Sin camión habitual asignado</span>
                              </div>
                            )}

                            <div className="relative">
                              <select
                                value={c.vehiculo_id || ''}
                                disabled={actualizandoVehiculoId === c.id}
                                onChange={(e) => handleCambiarVehiculoPredeterminado(c.id, e.target.value)}
                                className="w-full text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all cursor-pointer disabled:opacity-50"
                              >
                                <option value="">-- Sin vehículo habitual --</option>
                                {vehiculos.map((v) => {
                                  const asignadoAOtro = choferes.find(
                                    (otro) => otro.id !== c.id && otro.vehiculo_id === v.id
                                  );
                                  return (
                                    <option key={v.id} value={v.id}>
                                      [{v.patente}] {v.marca} {v.modelo}
                                      {asignadoAOtro ? ` (Habitual: ${asignadoAOtro.nombre})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Activo
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
