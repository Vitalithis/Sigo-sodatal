'use client';

import { useState, useTransition } from 'react';
import { actualizarRol } from '../actions';
import { CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

const ROLES = ['PENDIENTE', 'REPARTIDOR', 'OFICINA', 'ADMIN'];

const ROL_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:      { bg: '#dbeafe', text: '#013299' },
  OFICINA:    { bg: '#d1fae5', text: '#065f46' },
  REPARTIDOR: { bg: '#fef3c7', text: '#92400e' },
  PENDIENTE:  { bg: '#f1f5f9', text: '#64748b' },
};

type Usuario = {
  id: string;
  email: string | undefined;
  rol: string;
  nombre: string | null;
};

export default function RolesTable({ usuarios }: { usuarios: Usuario[] }) {
  const [isPending, startTransition] = useTransition();
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; text: string }>>({});

  function handleChange(userId: string, nuevoRol: string) {
    startTransition(async () => {
      const res = await actualizarRol(userId, nuevoRol);
      setMensajes((m) => ({
        ...m,
        [userId]: res.success
          ? { ok: true,  text: 'Actualizado' }
          : { ok: false, text: res.error ?? 'Error' },
      }));
      setTimeout(() => {
        setMensajes((m) => { const n = { ...m }; delete n[userId]; return n; });
      }, 3000);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: '#013299' }}>
            <th className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">Nombre</th>
            <th className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
            <th className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">Rol Actual</th>
            <th className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">Cambiar Rol</th>
            <th className="py-3 px-5 text-left text-xs font-bold text-white uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u, i) => {
            const colors = ROL_COLORS[u.rol] ?? ROL_COLORS['PENDIENTE'];
            const msg = mensajes[u.id];
            return (
              <tr
                key={u.id}
                className="border-b border-gray-100 last:border-0 transition-colors hover:bg-blue-50/30"
              >
                {/* Nombre */}
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: '#013299' }}
                    >
                      {(u.nombre ?? u.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{u.nombre ?? '—'}</span>
                  </div>
                </td>

                {/* Email */}
                <td className="py-3.5 px-5 text-sm text-gray-500">{u.email}</td>

                {/* Rol badge */}
                <td className="py-3.5 px-5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {u.rol}
                  </span>
                </td>

                {/* Select */}
                <td className="py-3.5 px-5">
                  <div className="relative w-36">
                    <select
                      defaultValue={u.rol}
                      disabled={isPending}
                      onChange={(e) => handleChange(u.id, e.target.value)}
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{ focusRingColor: '#013299' } as React.CSSProperties}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </td>

                {/* Feedback */}
                <td className="py-3.5 px-5">
                  {msg && (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      msg.ok
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {msg.ok
                        ? <CheckCircle className="h-3.5 w-3.5" />
                        : <AlertCircle className="h-3.5 w-3.5" />}
                      {msg.text}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}