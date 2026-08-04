'use client';

import { useState, useActionState } from 'react';
import { login, signup, type LoginState } from './actions';

const initialState: LoginState = { success: false, error: '' };

export default function AuthForms() {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const accion = modo === 'login' ? login : signup;
  const [state, formAction, isPending] = useActionState(accion, initialState);

  return (
    <div>
      <form action={formAction} className="mt-8 space-y-4">
        {modo === 'registro' && (
          <input
            name="nombre"
            type="text"
            placeholder="Nombre completo"
            className="block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 sm:text-sm"
          />
        )}
        <input
          name="rut"
          type="text"
          required
          autoComplete="username"
          placeholder="RUT (ej: 12345678-9)"
          className="block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 sm:text-sm"
        />
        <input
          name="clave"
          type="password"
          required
          autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
          placeholder="Contraseña"
          className="block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 sm:text-sm"
        />

        {state?.error && (
          <p className="text-sm font-medium text-center text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isPending
            ? 'Procesando...'
            : modo === 'login'
            ? 'Iniciar Sesión'
            : 'Crear Cuenta'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
        className="mt-4 w-full text-center text-sm text-slate-500 hover:text-blue-600"
      >
        {modo === 'login'
          ? '¿No tienes cuenta? Regístrate'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
}