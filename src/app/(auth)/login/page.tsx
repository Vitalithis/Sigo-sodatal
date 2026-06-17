import { login } from './actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()

  // Si el usuario ya tiene sesión activa, lo redirigimos a su panel
  // (El middleware suele atajar esto antes, pero es una capa extra de seguridad)
  if (data?.user) {
    const rol = data.user.user_metadata?.rol
    if (rol === 'REPARTIDOR') {
      redirect('/repartidor')
    } else {
      redirect('/admin')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            SIGO Sodatal
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* El formulario se conecta automáticamente con la función login de actions.ts */}
        <form action={login} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Correo electrónico"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Contraseña"
              />
            </div>
          </div>

          {/* Si actions.ts devuelve un error por la URL, lo mostramos aquí */}
          {searchParams?.error && (
            <p className="text-sm font-medium text-center text-red-500">
              {searchParams.error}
            </p>
          )}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}