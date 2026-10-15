'use client';

import React, { useState } from 'react';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Truck, 
  ShieldCheck, 
  LogOut, 
  Phone, 
  Mail, 
  FileText, 
  Calendar, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  BadgeCheck,
  Gauge
} from 'lucide-react';
import { actualizarMiPerfilAction, cambiarMiClaveAction } from '@/app/admin/cuenta/actions';

interface Props {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rut: string;
    telefono: string;
    rol: string;
    licencia_tipo?: string | null;
    vencimiento_lic?: string | null;
    fecha_ingreso?: string;
    activo: boolean;
  };
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
  } | null;
}

export default function PerfilRepartidorClient({ usuario, vehiculo }: Props) {
  const router = useRouter();

  // Estados de formularios
  const [tab, setTab] = useState<'DATOS' | 'AJUSTES'>('DATOS');

  // Datos personales
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [telefono, setTelefono] = useState(usuario.telefono === 'Sin registrar' ? '' : usuario.telefono);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Cambio de contraseña
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirm, setClaveConfirm] = useState('');
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Cerrar sesión
  const [loadingLogout, setLoadingLogout] = useState(false);

  const handleCerrarSesion = async () => {
    setLoadingLogout(true);
    try {
      await signOut();
      router.push('/login');
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil(null);

    try {
      const res = await actualizarMiPerfilAction({
        nombre,
        apellido,
        telefono,
      });

      if (res.success) {
        setMensajePerfil({ tipo: 'ok', texto: res.message });
      } else {
        setMensajePerfil({ tipo: 'error', texto: res.message });
      }
    } catch (err: any) {
      setMensajePerfil({ tipo: 'error', texto: err.message || 'Error al actualizar datos.' });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoClave(true);
    setMensajeClave(null);

    if (claveNueva !== claveConfirm) {
      setMensajeClave({ tipo: 'error', texto: 'La nueva contraseña y su confirmación no coinciden.' });
      setGuardandoClave(false);
      return;
    }

    if (claveNueva.length < 6) {
      setMensajeClave({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      setGuardandoClave(false);
      return;
    }

    try {
      const res = await cambiarMiClaveAction({
        claveActual,
        claveNueva,
      });

      if (res.success) {
        setMensajeClave({ tipo: 'ok', texto: res.message });
        setClaveActual('');
        setClaveNueva('');
        setClaveConfirm('');
      } else {
        setMensajeClave({ tipo: 'error', texto: res.message });
      }
    } catch (err: any) {
      setMensajeClave({ tipo: 'error', texto: err.message || 'Error al cambiar contraseña.' });
    } finally {
      setGuardandoClave(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#013299] text-white text-2xl sm:text-3xl font-black rounded-3xl flex items-center justify-center shadow-lg shadow-[#013299]/20 border-4 border-blue-50 shrink-0">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {usuario.nombre} {usuario.apellido}
              </h1>
              <span className="bg-blue-50 text-[#013299] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-blue-200">
                Repartidor
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              RUT: {usuario.rut} • {usuario.email}
            </p>
          </div>
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={handleCerrarSesion}
          disabled={loadingLogout}
          className="self-start sm:self-center bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>{loadingLogout ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </button>
      </div>

      {/* Selector de Pestañas: Datos de Sesión vs Ajustes de Cuenta */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center max-w-md">
        <button
          onClick={() => setTab('DATOS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tab === 'DATOS'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Datos de la Sesión</span>
        </button>

        <button
          onClick={() => setTab('AJUSTES')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            tab === 'AJUSTES'
              ? 'bg-[#013299] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Ajustes de la Cuenta</span>
        </button>
      </div>

      {/* PESTAÑA 1: DATOS DE LA SESIÓN */}
      {tab === 'DATOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Información Personal y Contacto */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#013299]" /> Información Personal y Sesión
            </h2>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#013299]" /> RUT Personal:
                </span>
                <span className="font-extrabold text-slate-900">{usuario.rut}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#013299]" /> Correo Electrónico:
                </span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">{usuario.email}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#013299]" /> Teléfono Registrado:
                </span>
                <span className="font-bold text-slate-900">{usuario.telefono || 'Sin registrar'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" /> Rol en el Sistema:
                </span>
                <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase text-[10px]">
                  {usuario.rol}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#013299]" /> Fecha de Ingreso:
                </span>
                <span className="font-bold text-slate-900">{usuario.fecha_ingreso || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#013299]" /> Licencia de Conducir:
                </span>
                <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  Clase {usuario.licencia_tipo || 'B'}
                  {usuario.vencimiento_lic ? ` (Vence: ${usuario.vencimiento_lic})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Vehículo Asignado */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#013299]" /> Vehículo de Flota Asignado
            </h2>

            {vehiculo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <p className="font-black text-slate-900 text-base">{vehiculo.marca} {vehiculo.modelo}</p>
                    <p className="text-xs text-slate-500 font-medium">Modelo año {vehiculo.anio}</p>
                  </div>
                  <span className="bg-amber-400 text-slate-900 text-sm font-black px-3.5 py-1.5 rounded-xl shadow-sm tracking-wider">
                    {vehiculo.patente}
                  </span>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
                  <span className="text-blue-900 font-bold flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-[#013299]" /> Odómetro Actual:
                  </span>
                  <span className="font-black text-sm text-[#013299]">
                    {vehiculo.kilometraje_actual.toLocaleString('es-CL')} km
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Sin vehículo de flota asignado actualmente.</p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setTab('AJUSTES')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-[#013299]" />
                <span>Ir a Ajustes de la Cuenta</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA 2: AJUSTES DE LA CUENTA */}
      {tab === 'AJUSTES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Formulario 1: Editar Datos Personales */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#013299]" /> Editar Datos Personales
            </h2>

            {mensajePerfil && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                mensajePerfil.tipo === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {mensajePerfil.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{mensajePerfil.texto}</span>
              </div>
            )}

            <form onSubmit={handleGuardarPerfil} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Apellido</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Teléfono de Contacto</label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="w-full bg-[#013299] hover:bg-blue-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{guardandoPerfil ? 'Guardando cambios...' : 'Guardar Datos Personales'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Formulario 2: Cambiar Contraseña */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#013299]" /> Seguridad y Cambio de Contraseña
            </h2>

            {mensajeClave && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                mensajeClave.tipo === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {mensajeClave.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{mensajeClave.texto}</span>
              </div>
            )}

            <form onSubmit={handleCambiarClave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={claveActual}
                  onChange={(e) => setClaveActual(e.target.value)}
                  required
                  placeholder="Tu clave actual de acceso"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={claveConfirm}
                  onChange={(e) => setClaveConfirm(e.target.value)}
                  required
                  placeholder="Repite la nueva clave"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardandoClave}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{guardandoClave ? 'Actualizando contraseña...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
