'use client';

import React, { useState, useEffect } from 'react';
import {
  crearChoferAction,
  obtenerChoferesAction,
  obtenerUsuariosDisponiblesAction,
  asignarRolRepartidorAction
} from '../actions';
import { UserPlus, Users, Save, Phone, Mail, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1';

interface Props {
  choferesIniciales: any[];
}

export default function ChoferesManager({ choferesIniciales }: Props) {
  const [choferes, setChoferes] = useState(choferesIniciales);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modo, setModo] = useState<'crear' | 'asignar'>('crear');
  const { popup, showSuccess, showError, close } = usePopup();

  // Formulario nuevo chofer
  const [formChofer, setFormChofer] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    telefono: '',
    email: '',
    password: '',
    licencia_tipo: 'Clase A4',
  });

  // Formulario asignación de usuario existente
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState('');
  const [licenciaAsignar, setLicenciaAsignar] = useState('Clase A4');

  const refrescarDatos = async () => {
    setCargando(true);
    const [rc, ru] = await Promise.all([
      obtenerChoferesAction(),
      obtenerUsuariosDisponiblesAction()
    ]);
    if (rc.success) setChoferes(rc.choferes);
    if (ru.success) setUsuariosDisponibles(ru.usuarios);
    setCargando(false);
  };

  useEffect(() => {
    refrescarDatos();
  }, []);

  const registroChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChofer.nombre.trim() || !formChofer.rut.trim() || !formChofer.email.trim()) {
      showError('Datos incompletos', 'Nombre, RUT y Correo Electrónico son obligatorios.');
      return;
    }
    setCargando(true);
    const res = await crearChoferAction(formChofer);
    if (res.success) {
      setFormChofer({
        nombre: '',
        apellido: '',
        rut: '',
        telefono: '',
        email: '',
        password: '',
        licencia_tipo: 'Clase A4'
      });
      await refrescarDatos();
      showSuccess(
        'Repartidor Creado',
        'El usuario ha sido registrado con rol REPARTIDOR y cuenta de acceso habilitada.'
      );
    } else {
      showError('Error al guardar', res.message || 'No se pudo crear el conductor.');
    }
    setCargando(false);
  };

  const asignarUsuarioExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSeleccionadoId) {
      showError('Selección requerida', 'Debes seleccionar un usuario de la lista.');
      return;
    }
    setCargando(true);
    const res = await asignarRolRepartidorAction(usuarioSeleccionadoId, licenciaAsignar);
    if (res.success) {
      setUsuarioSeleccionadoId('');
      await refrescarDatos();
      showSuccess(
        'Rol Asignado',
        'El usuario seleccionado ahora tiene el rol REPARTIDOR y aparece en la flota activa.'
      );
    } else {
      showError('Error al asignar', res.message || 'No se pudo asignar el rol.');
    }
    setCargando(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-slate-900">
      <PopupGlobal popup={popup} onClose={close} />

      {/* COLUMNA 1: FORMULARIO CON PESTAÑAS (CREAR O ASIGNAR) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl text-white" style={{ backgroundColor: '#013299' }}>
            {modo === 'crear' ? <UserPlus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Gestión de Choferes
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Crea nuevos o asigna usuarios existentes
            </p>
          </div>
        </div>

        {/* SELECTOR DE MODO: CREAR NUEVO VS ASIGNAR EXISTENTE */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setModo('crear')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              modo === 'crear'
                ? 'bg-white text-[#013299] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ➕ Crear Nuevo
          </button>
          <button
            type="button"
            onClick={() => setModo('asignar')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              modo === 'asignar'
                ? 'bg-white text-[#013299] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            👤 Asignar Rol ({usuariosDisponibles.length})
          </button>
        </div>

        {/* ── MODO 1: REGISTRAR NUEVO CHOFER CON ACCESO ── */}
        {modo === 'crear' ? (
          <form onSubmit={registroChofer} className="space-y-3">
            <div>
              <label className={labelCls}>Nombre y Apellido *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formChofer.nombre}
                  onChange={(e) => setFormChofer({ ...formChofer, nombre: e.target.value })}
                  className={inputCls}
                  required
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={formChofer.apellido}
                  onChange={(e) => setFormChofer({ ...formChofer, apellido: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>RUT *</label>
                <input
                  type="text"
                  placeholder="12.345.678-9"
                  value={formChofer.rut}
                  onChange={(e) => setFormChofer({ ...formChofer, rut: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input
                  type="text"
                  placeholder="+569..."
                  value={formChofer.telefono}
                  onChange={(e) => setFormChofer({ ...formChofer, telefono: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email de Acceso (Usuario) *</label>
              <input
                type="email"
                placeholder="chofer@sodatal.cl"
                value={formChofer.email}
                onChange={(e) => setFormChofer({ ...formChofer, email: e.target.value })}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Contraseña de Acceso <span className="font-normal text-[10px] text-slate-400">(Opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Por defecto: sodatal123"
                  value={formChofer.password}
                  onChange={(e) => setFormChofer({ ...formChofer, password: e.target.value })}
                  className={inputCls}
                  minLength={6}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Permitirá al chofer iniciar sesión en la aplicación móvil o web.
              </p>
            </div>

            <div>
              <label className={labelCls}>Licencia de Conducir</label>
              <select
                value={formChofer.licencia_tipo}
                onChange={(e) => setFormChofer({ ...formChofer, licencia_tipo: e.target.value })}
                className={`${inputCls} font-bold text-slate-700`}
              >
                <option value="Clase A4">Clase A4 (Camiones simples)</option>
                <option value="Clase A5">Clase A5 (Camiones articulados)</option>
                <option value="Clase B">Clase B (Vehículo particular)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
              style={{ backgroundColor: '#013299' }}
            >
              <Save className="w-4 h-4" />
              <span>{cargando ? 'Guardando...' : 'Crear Repartidor con Acceso'}</span>
            </button>
          </form>
        ) : (
          /* ── MODO 2: ASIGNAR ROL REPARTIDOR A USUARIO REGISTRADO ── */
          <form onSubmit={asignarUsuarioExistente} className="space-y-4">
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs text-slate-600">
              <p className="font-bold text-[#013299] mb-0.5">ℹ️ Usuarios Registrados en el Sistema</p>
              <p className="text-[11px]">
                Selecciona cualquier usuario que se haya registrado o creado en el sistema para asignarle el rol de <b>REPARTIDOR</b> y habilitarlo para rutas.
              </p>
            </div>

            <div>
              <label className={labelCls}>Seleccionar Usuario *</label>
              {usuariosDisponibles.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                  No hay usuarios pendientes u otros roles disponibles para asignar.
                </p>
              ) : (
                <select
                  value={usuarioSeleccionadoId}
                  onChange={(e) => setUsuarioSeleccionadoId(e.target.value)}
                  className={`${inputCls} font-semibold`}
                  required
                >
                  <option value="">-- Elige un usuario del sistema --</option>
                  {usuariosDisponibles.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido || ''} ({u.email} — Rol actual: {u.rol})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelCls}>Licencia de Conducir</label>
              <select
                value={licenciaAsignar}
                onChange={(e) => setLicenciaAsignar(e.target.value)}
                className={`${inputCls} font-bold text-slate-700`}
              >
                <option value="Clase A4">Clase A4 (Camiones simples)</option>
                <option value="Clase A5">Clase A5 (Camiones articulados)</option>
                <option value="Clase B">Clase B (Vehículo particular)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cargando || usuariosDisponibles.length === 0}
              className="w-full mt-2 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
              style={{ backgroundColor: '#013299' }}
            >
              <UserCheck className="w-4 h-4" />
              <span>{cargando ? 'Asignando...' : 'Asignar como Repartidor'}</span>
            </button>
          </form>
        )}
      </div>

      {/* COLUMNA 2 Y 3: LISTADO DE CHOFERES ACTIVOS */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: '#013299' }}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Listado de Choferes / Repartidores Activos
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Usuarios con rol REPARTIDOR habilitados para rutas y despacho
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#013299] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Total: {choferes.length}
          </span>
        </div>

        {cargando ? (
          <div className="text-center py-12 text-xs font-bold text-slate-400 tracking-widest uppercase">
            Actualizando Planilla...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">RUT / Fono</th>
                  <th className="p-3">Licencia</th>
                  <th className="p-3">Email de Acceso</th>
                  <th className="p-3 text-center">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {choferes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      No hay choferes registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  choferes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {c.nombre} {c.apellido || ''}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        <div className="font-mono text-slate-800">{c.rut}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.telefono || 'Sin fono'}</span>
                        </div>
                      </td>
                      <td className="p-3 font-extrabold text-[#013299]">
                        <span className="bg-blue-50 text-[#013299] px-2.5 py-1 rounded-lg border border-blue-100 text-[10px] font-mono inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {c.licencia_tipo || 'Clase B'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          REPARTIDOR
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
