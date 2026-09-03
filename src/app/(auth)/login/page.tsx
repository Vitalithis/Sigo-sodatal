import { redirect } from 'next/navigation';
import { getUsuarioActual } from '@/lib/auth-session';
import AuthForms from './AuthForms';

export default async function LoginPage() {
  const usuario = await getUsuarioActual();

  if (usuario) {
    if (usuario.rol === 'REPARTIDOR') redirect('/repartidor');
    else redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-2 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">SIGO Sodatal</h2>
          <p className="mt-2 text-sm text-slate-600">Ingresa tus credenciales para continuar</p>
        </div>
        <AuthForms />
      </div>
    </div>
  );
}