'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

const initialState: LoginState = { success: false, error: '' };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <label htmlFor="rut" className="sr-only">
            RUT
          </label>
          <input
            id="rut"
            name="rut"
            type="text"
            required
            autoComplete="username"
            className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="RUT (ej: 12345678-9)"
          />
        </div>
        <div>
          <label htmlFor="clave" className="sr-only">
            Contraseña
          </label>
          <input
            id="clave"
            name="clave"
            type="password"
            required
            autoComplete="current-password"
            className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Contraseña"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm font-medium text-center text-red-500">
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {isPending ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </div>
    </form>
  );
}