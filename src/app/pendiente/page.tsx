import { logout } from '../(auth)/login/actions';

export default function PendientePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <h1 className="text-2xl font-bold text-slate-900">SIGO Sodatal</h1>
      <p className="mt-4 max-w-md text-slate-600">
        Tu cuenta fue creada correctamente. Un administrador debe asignarte un
        rol antes de que puedas acceder al sistema. Inténtalo de nuevo más
        tarde.
      </p>
      <form action={logout} className="mt-6">
        <button type="submit" className="text-sm font-semibold text-blue-600 hover:underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}