'use client';

import { useState, useTransition } from 'react';
import {
  crearComuna, toggleComuna, listSectores, crearSector, toggleSector,
  editarComuna, eliminarComuna, editarSector, eliminarSector,
} from '../actions';
import { Plus, ChevronRight, MapPin, Users, Pencil, Trash2, Check, X } from 'lucide-react';

type Comuna = {
  id: string;
  nombre: string;
  activa: boolean;
  _count: { sectores: number };
};

type Sector = {
  id: string;
  nombre: string;
  activo: boolean;
  _count: { clientes: number };
};

export default function ComunaPanel({ comunas: inicial }: { comunas: Comuna[] }) {
  const [comunas, setComunas] = useState(inicial);
  const [comunaActiva, setComunaActiva] = useState<Comuna | null>(null);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [nuevaComuna, setNuevaComuna] = useState('');
  const [nuevoSector, setNuevoSector] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Edición inline
  const [editandoComuna, setEditandoComuna] = useState<string | null>(null);
  const [editandoSector, setEditandoSector] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');

  function seleccionarComuna(comuna: Comuna) {
    setComunaActiva(comuna);
    startTransition(async () => {
      const data = await listSectores(comuna.id);
      setSectores(data);
    });
  }

  function handleCrearComuna() {
    if (!nuevaComuna.trim()) return;
    startTransition(async () => {
      const res = await crearComuna(nuevaComuna);
      if (!res.success) { setError(res.error); return; }
      setNuevaComuna('');
      setError('');
      window.location.reload();
    });
  }

  function handleEditarComuna(id: string) {
    if (!editNombre.trim()) return;
    startTransition(async () => {
      const res = await editarComuna(id, editNombre);
      if (!res.success) { setError(res.error); return; }
      setEditandoComuna(null);
      setError('');
      window.location.reload();
    });
  }

  function handleEliminarComuna(id: string) {
    startTransition(async () => {
      const res = await eliminarComuna(id);
      if (!res.success) { setError(res.error); return; }
      setError('');
      if (comunaActiva?.id === id) setComunaActiva(null);
      window.location.reload();
    });
  }

  function handleCrearSector() {
    if (!nuevoSector.trim() || !comunaActiva) return;
    startTransition(async () => {
      const res = await crearSector(nuevoSector, comunaActiva.id);
      if (!res.success) { setError(res.error); return; }
      setNuevoSector('');
      setError('');
      const data = await listSectores(comunaActiva.id);
      setSectores(data);
    });
  }

  function handleEditarSector(id: string) {
    if (!editNombre.trim()) return;
    startTransition(async () => {
      const res = await editarSector(id, editNombre);
      if (!res.success) { setError(res.error); return; }
      setEditandoSector(null);
      setError('');
      if (comunaActiva) {
        const data = await listSectores(comunaActiva.id);
        setSectores(data);
      }
    });
  }

  function handleEliminarSector(id: string) {
    startTransition(async () => {
      const res = await eliminarSector(id);
      if (!res.success) { setError(res.error); return; }
      setError('');
      if (comunaActiva) {
        const data = await listSectores(comunaActiva.id);
        setSectores(data);
      }
    });
  }

  function handleToggleSector(id: string, activo: boolean) {
    startTransition(async () => {
      await toggleSector(id, !activo);
      if (comunaActiva) {
        const data = await listSectores(comunaActiva.id);
        setSectores(data);
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* Panel Comunas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ backgroundColor: '#013299' }}>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Comunas</h2>
          <span className="text-xs text-blue-200">{comunas.length} registradas</span>
        </div>

        <div className="divide-y divide-gray-50">
          {comunas.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-blue-50/40 ${
                comunaActiva?.id === c.id ? 'bg-blue-50 border-l-4 border-[#013299]' : ''
              }`}
            >
              {editandoComuna === c.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditarComuna(c.id)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#013299]"
                    autoFocus
                  />
                  <button onClick={() => handleEditarComuna(c.id)} className="text-green-600 hover:text-green-800">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditandoComuna(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button className="flex-1 text-left" onClick={() => seleccionarComuna(c)}>
                    <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                    <p className="text-xs text-gray-400">{c._count.sectores} sectores</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.activa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => { setEditandoComuna(c.id); setEditNombre(c.nombre); }}
                      className="text-gray-400 hover:text-[#013299]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleEliminarComuna(c.id)}
                      disabled={c._count.sectores > 0}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={c._count.sectores > 0 ? 'Elimina los sectores primero' : 'Eliminar'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <input
              value={nuevaComuna}
              onChange={(e) => setNuevaComuna(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCrearComuna()}
              placeholder="Nueva comuna..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#013299]"
            />
            <button
              onClick={handleCrearComuna}
              disabled={isPending || !nuevaComuna.trim()}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#013299' }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {/* Panel Sectores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ backgroundColor: '#013299' }}>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {comunaActiva ? `Sectores · ${comunaActiva.nombre}` : 'Sectores'}
          </h2>
          {comunaActiva && (
            <span className="text-xs text-blue-200">{sectores.length} sectores</span>
          )}
        </div>

        {!comunaActiva ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <MapPin className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Selecciona una comuna</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {sectores.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center text-gray-400">
                  No hay sectores en esta comuna
                </p>
              ) : sectores.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                  {editandoSector === s.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditarSector(s.id)}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#013299]"
                        autoFocus
                      />
                      <button onClick={() => handleEditarSector(s.id)} className="text-green-600 hover:text-green-800">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditandoSector(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.nombre}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {s._count.clientes} clientes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSector(s.id, s.activo)}
                          disabled={isPending}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            s.activo
                              ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {s.activo ? 'Activo' : 'Inactivo'}
                        </button>
                        <button
                          onClick={() => { setEditandoSector(s.id); setEditNombre(s.nombre); }}
                          className="text-gray-400 hover:text-[#013299]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminarSector(s.id)}
                          disabled={s._count.clientes > 0}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={s._count.clientes > 0 ? 'Tiene clientes asignados' : 'Eliminar'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-2">
                <input
                  value={nuevoSector}
                  onChange={(e) => setNuevoSector(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCrearSector()}
                  placeholder={`Nuevo sector en ${comunaActiva.nombre}...`}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#013299]"
                />
                <button
                  onClick={handleCrearSector}
                  disabled={isPending || !nuevoSector.trim()}
                  className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#013299' }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}