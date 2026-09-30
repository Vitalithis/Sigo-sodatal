'use client';

import React, { useState } from 'react';
import { crearChoferAction, obtenerChoferesAction } from '../actions';
import { UserPlus, Users, Save, Phone, Mail, CreditCard, ShieldCheck } from 'lucide-react';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

const inputCls = 'w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-colors placeholder:text-slate-400';
const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1';

interface Props {
  choferesIniciales: any[];
}

export default function ChoferesManager({ choferesIniciales }: Props) {
  const [choferes, setChoferes] = useState(choferesIniciales);
  const [cargando, setCargando] = useState(false);
  const { popup, showSuccess, showError, close } = usePopup();

  const [formChofer, setFormChofer] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    telefono: '',
    email: '',
    licencia_tipo: 'Clase A4',
  });

  const refrescarDatos = async () => {
    setCargando(true);
    const rc = await obtenerChoferesAction();
    if (rc.success) setChoferes(rc.choferes);
    setCargando(false);
  };

  const registroChofer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChofer.nombre || !formChofer.rut) {
      showError('Datos incompletos', 'Nombre y RUT son obligatorios.');
      return;
    }
    setCargando(true);
    const res = await crearChoferAction(formChofer);
    if (res.success) {
      setFormChofer({ nombre: '', apellido: '', rut: '', telefono: '', email: '', licencia_tipo: 'Clase A4' });
      await refrescarDatos();
      showSuccess('Conductor Registrado', 'El repartidor se ha creado exitosamente.');
    } else {
      showError('Error al guardar', res.message || 'No se pudo crear el conductor.');
    }
    setCargando(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-slate-900">
      <PopupGlobal popup={popup} onClose={close} />

      {/* COLUMNA 1: FORMULARIO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl text-white" style={{ backgroundColor: '#013299' }}>
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Nuevo Repartidor
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Ingresa los datos personales y licencia</p>
          </div>
        </div>

        <form onSubmit={registroChofer} className="space-y-3">
          <div>
            <label className={labelCls}>Nombre y Apellido</label>
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
              <label className={labelCls}>RUT</label>
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
            <label className={labelCls}>Email de Acceso</label>
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
            <label className={labelCls}>Licencia de Conducir</label>
            <select
              value={formChofer.licencia_tipo}
              onChange={(e) => setFormChofer({ ...formChofer, licencia_tipo: e.target.value })}
              className={`${inputCls} font-bold text-slate-700`}
            >
              <option value="Clase A4">Clase A4 (Camiones)</option>
              <option value="Clase A5">Clase A5</option>
              <option value="Clase B">Clase B (Particular)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            style={{ backgroundColor: '#013299' }}
          >
            <Save className="w-4 h-4" />
            <span>{cargando ? 'Guardando...' : 'Registrar Chofer'}</span>
          </button>
        </form>
      </div>

      {/* COLUMNA 2 Y 3: PLANILLA */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: '#013299' }}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Listado de Choferes Activos
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Conductores registrados en el sistema</p>
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
                  <th className="p-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {choferes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      No hay choferes registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  choferes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {c.nombre} {c.apellido}
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
