import { listUsuarios } from './actions';
import RolesTable from './components/RolesTable';
import { ShieldCheck } from 'lucide-react';

export default async function RolesPage() {
  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>

          <h1 className="text-2xl font-bold text-gray-800">
            Gestión de Roles
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Asigna el rol correspondiente a cada usuario registrado en el sistema.
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: '#013299' }}
        >
          <ShieldCheck className="h-4 w-4" />
          {usuarios.length} usuarios
        </div>
      </div>

      {/* TABLA */}
      <RolesTable usuarios={usuarios} />

    </div>
  );
}