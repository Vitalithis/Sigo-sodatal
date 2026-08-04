import { listUsuarios } from './actions';
import RolesTable from './components/RolesTable';

export default async function RolesPage() {
  const usuarios = await listUsuarios();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Gestión de Roles</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Asigna el rol correspondiente a cada usuario registrado en el sistema.
      </p>
      <RolesTable usuarios={usuarios} />
    </div>
  );
}