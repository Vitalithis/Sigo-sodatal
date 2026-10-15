'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  KeyRound,
  Sliders,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Bell,
  Volume2,
  VolumeX,
  Save,
} from 'lucide-react';
import {
  obtenerMiPerfilAction,
  actualizarMiPerfilAction,
  cambiarMiClaveAction,
  DatosMiPerfil,
} from '@/app/admin/cuenta/actions';
import { usePopup } from '@/hooks/usePopup';
import PopupGlobal from '@/components/ui/PopupGlobal';

interface ModalAjustesCuentaProps {
  isOpen: boolean;
  onClose: () => void;
  nombreActual?: string;
  rolActual?: string;
}

type TabType = 'perfil' | 'seguridad' | 'preferencias';

export default function ModalAjustesCuenta({
  isOpen,
  onClose,
  nombreActual,
  rolActual,
}: ModalAjustesCuentaProps) {
  const { popup, showSuccess, showError, close } = usePopup();

  const [activeTab, setActiveTab] = useState<TabType>('perfil');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoClave, setGuardandoClave] = useState(false);

  // Datos del perfil
  const [perfil, setPerfil] = useState<DatosMiPerfil | null>(null);
  const [nombre, setNombre] = useState(nombreActual || '');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');

  // Contraseña
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirmacion, setClaveConfirmacion] = useState('');
  const [verClaveActual, setVerClaveActual] = useState(false);
  const [verClaveNueva, setVerClaveNueva] = useState(false);
  const [verClaveConfirmacion, setVerClaveConfirmacion] = useState(false);

  // Preferencias
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [duracionToast, setDuracionToast] = useState('3500');

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardandoPerfil && !guardandoClave) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardandoPerfil, guardandoClave, onClose]);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      setCargandoDatos(true);
      obtenerMiPerfilAction().then((res) => {
        setCargandoDatos(false);
        if (res.success && res.usuario) {
          setPerfil(res.usuario);
          setNombre(res.usuario.nombre);
          setApellido(res.usuario.apellido);
          setTelefono(res.usuario.telefono);
        }
      });

      // Cargar preferencias locales
      try {
        const sonidoGuardado = localStorage.getItem('sigo_preferencia_sonido');
        if (sonidoGuardado !== null) {
          setSonidoHabilitado(sonidoGuardado === 'true');
        }
        const duracionGuardada = localStorage.getItem('sigo_preferencia_toast_duracion');
        if (duracionGuardada) {
          setDuracionToast(duracionGuardada);
        }
      } catch (e) {
        // Ignorar en SSR o error de storage
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Guardar cambios del perfil
  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || nombre.trim().length < 2) {
      showError('Nombre Inválido', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setGuardandoPerfil(true);
    const res = await actualizarMiPerfilAction({
      nombre,
      apellido,
      telefono,
    });
    setGuardandoPerfil(false);

    if (res.success) {
      showSuccess('Perfil Actualizado', res.message);
      if (perfil) {
        setPerfil({
          ...perfil,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim(),
        });
      }
    } else {
      showError('Error al Guardar', res.message);
    }
  };

  // 2. Guardar cambio de contraseña
  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!claveActual) {
      showError('Contraseña Actual', 'Debes ingresar tu contraseña actual.');
      return;
    }
    if (!claveNueva || claveNueva.length < 6) {
      showError('Contraseña Inválida', 'La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }
    if (claveNueva !== claveConfirmacion) {
      showError('Contraseñas no Coinciden', 'La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (claveActual === claveNueva) {
      showError('Contraseña Idéntica', 'La nueva contraseña debe ser distinta a la actual.');
      return;
    }

    setGuardandoClave(true);
    const res = await cambiarMiClaveAction({
      claveActual,
      claveNueva,
    });
    setGuardandoClave(false);

    if (res.success) {
      showSuccess('Contraseña Actualizada', res.message);
      setClaveActual('');
      setClaveNueva('');
      setClaveConfirmacion('');
    } else {
      showError('Error de Seguridad', res.message);
    }
  };

  // 3. Guardar preferencias
  const handleGuardarPreferencias = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('sigo_preferencia_sonido', String(sonidoHabilitado));
      localStorage.setItem('sigo_preferencia_toast_duracion', duracionToast);
      showSuccess('Preferencias Guardadas', 'Tus preferencias locales han sido guardadas en este navegador.');
    } catch (err) {
      showError('Error', 'No se pudieron guardar las preferencias en el navegador.');
    }
  };

  const inicial = (nombre || nombreActual || 'U').charAt(0).toUpperCase();
  const fechaIngresoFormateada = perfil?.fecha_ingreso
    ? new Date(perfil.fecha_ingreso).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'No registrada';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardandoPerfil && !guardandoClave) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <PopupGlobal popup={popup} onClose={close} />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Cabecera Corporativa */}
        <div className="bg-gradient-to-r from-[#013299] via-[#012a80] to-[#012060] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 text-base shadow-inner">
              {inicial}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight text-white">
                Ajustes de la Cuenta
              </h3>
              <p className="text-xs text-blue-200">
                Gestiona tu información personal, seguridad y preferencias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardandoPerfil || guardandoClave}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white disabled:opacity-50"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/80 gap-2 shrink-0">
          {[
            { id: 'perfil', label: 'Mi Perfil', icon: User },
            { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
            { id: 'preferencias', label: 'Preferencias', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const activo = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
                  activo
                    ? 'border-[#013299] text-[#013299] bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${activo ? 'text-[#013299]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto flex-1">
          {cargandoDatos ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#013299]" />
              <p className="text-xs font-semibold">Cargando tus datos de cuenta...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: MI PERFIL */}
              {activeTab === 'perfil' && (
                <form onSubmit={handleGuardarPerfil} className="space-y-5">
                  {/* Tarjeta de Resumen / Identidad */}
                  <div className="bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-100/80 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#013299] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#013299]/20">
                        {inicial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {nombre} {apellido}
                          </h4>
                          <span className="inline-block px-2 py-0.5 bg-[#013299] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            {perfil?.rol || rolActual || 'USUARIO'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{perfil?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Campos Editables */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Daniel"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        placeholder="Ej: Pérez"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Teléfono de Contacto
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos del Sistema (Informativos) */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Datos institucionales
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" /> RUT:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {perfil?.rut || '—'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Ingreso:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {fechaIngresoFormateada}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botón Guardar Perfil */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={guardandoPerfil}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md shadow-[#013299]/20 hover:shadow-none transition-all disabled:opacity-50"
                    >
                      {guardandoPerfil ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Guardar Perfil</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SEGURIDAD */}
              {activeTab === 'seguridad' && (
                <form onSubmit={handleCambiarClave} className="space-y-4">
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        Cambiar Contraseña de Acceso
                      </h4>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        Para tu seguridad, ingresa tu contraseña actual antes de registrar una nueva clave. La nueva clave debe contener al menos 6 caracteres.
                      </p>
                    </div>
                  </div>

                  {/* Contraseña Actual */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contraseña Actual *
                    </label>
                    <div className="relative">
                      <input
                        type={verClaveActual ? 'text' : 'password'}
                        required
                        value={claveActual}
                        onChange={(e) => setClaveActual(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setVerClaveActual(!verClaveActual)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {verClaveActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={verClaveNueva ? 'text' : 'password'}
                        required
                        value={claveNueva}
                        onChange={(e) => setClaveNueva(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setVerClaveNueva(!verClaveNueva)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {verClaveNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={verClaveConfirmacion ? 'text' : 'password'}
                        required
                        value={claveConfirmacion}
                        onChange={(e) => setClaveConfirmacion(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013299]/20 focus:border-[#013299] transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setVerClaveConfirmacion(!verClaveConfirmacion)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {verClaveConfirmacion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {claveNueva && claveConfirmacion && claveNueva !== claveConfirmacion && (
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Las contraseñas no coinciden.
                    </p>
                  )}

                  {/* Botón Actualizar Clave */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={guardandoClave || !claveActual || claveNueva.length < 6 || claveNueva !== claveConfirmacion}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 hover:shadow-none transition-all disabled:opacity-50"
                    >
                      {guardandoClave ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      <span>Actualizar Contraseña</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: PREFERENCIAS */}
              {activeTab === 'preferencias' && (
                <form onSubmit={handleGuardarPreferencias} className="space-y-5">
                  <div className="space-y-4">
                    {/* Sonido de Alertas y Notificaciones */}
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100/70 rounded-xl text-[#013299]">
                          {sonidoHabilitado ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            Sonidos de la Interfaz
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Reproducir confirmaciones de sonido al emitir acciones y alertas
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sonidoHabilitado}
                          onChange={(e) => setSonidoHabilitado(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#013299]"></div>
                      </label>
                    </div>

                    {/* Duración de Toasts */}
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100/70 rounded-xl text-[#013299]">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            Duración de Notificaciones Toast
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tiempo en pantalla antes de auto-cerrar los mensajes
                          </p>
                        </div>
                      </div>
                      <select
                        value={duracionToast}
                        onChange={(e) => setDuracionToast(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#013299]/20"
                      >
                        <option value="2500">Rápido (2.5 s)</option>
                        <option value="3500">Estándar (3.5 s)</option>
                        <option value="5500">Extendido (5.5 s)</option>
                      </select>
                    </div>
                  </div>

                  {/* Botón Guardar Preferencias */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#013299] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md shadow-[#013299]/20 hover:shadow-none transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Preferencias</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
