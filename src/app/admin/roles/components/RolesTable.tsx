'use client';

import { useState, useTransition } from 'react';
import { actualizarRol } from '../actions';

const ROLES = ['PENDIENTE', 'REPARTIDOR', 'OFICINA', 'ADMIN'];

type Usuario = {
  id: string;
  email: string | undefined;
  rol: string;
  nombre: string | null;
};

export default function RolesTable({ usuarios }: { usuarios: Usuario[] }) {
  const [isPending, startTransition] = useTransition();
  const [mensajes, setMensajes] = useState<Record<string, string>>({});

  function handleChange(userId: string, nuevoRol: string) {
    startTransition(async () => {
      const res = await actualizarRol(userId, nuevoRol);
      setMensajes((m) => ({
        ...m,
        [userId]: res.success ? 'Actualizado ✓' : res.error,
      }));
    });
  }

  return (
    <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
      <thead>
        <tr className="text-left border-b bg-slate-50">
          <th className="py-3 px-4">Nombre</th>
          <th className="py-3 px-4">RUT / Email</th>
          <th className="py-3 px-4">Rol actual</th>
          <th className="py-3 px-4">Cambiar rol</th>
        </tr>
      </thead>
      <tbody>
        {usuarios.map((u) => (
          <tr key={u.id} className="border-b last:border-0">
            <td className="py-3 px-4">{u.nombre ?? '—'}</td>
            <td className="py-3 px-4 text-slate-500">{u.email}</td>
            <td className="py-3 px-4">
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">
                {u.rol}
              </span>
            </td>
            <td className="py-3 px-4">
              <select
                defaultValue={u.rol}
                disabled={isPending}
                onChange={(e) => handleChange(u.id, e.target.value)}
                className="rounded border-slate-300 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {mensajes[u.id] && (
                <span className="ml-2 text-xs text-slate-500">{mensajes[u.id]}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}