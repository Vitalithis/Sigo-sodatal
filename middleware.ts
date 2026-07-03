import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ------------------------------------------------------------------
// Caché en memoria del usuario verificado por Supabase.
//
// Antes: supabase.auth.getUser() (llamada de red al servidor de Auth)
// se ejecutaba en TODAS las navegaciones (incluyendo los prefetch
// automáticos de cada <Link> visible en el sidebar), lo que generaba
// varios segundos de demora perceptible antes de que Next.js pudiera
// siquiera empezar a renderizar la ruta / mostrar el loading.tsx.
//
// La caché vive mientras la instancia del servidor esté "caliente"
// (normal en dev y en producción entre requests). Se indexa por el
// contenido de las cookies "sb-*" (access/refresh token), así que
// se invalida sola apenas el usuario cierra sesión o el token rota.
// El TTL es corto (30s) para no debilitar la seguridad: seguimos
// validando el JWT contra Supabase con la misma frecuencia que antes
// a efectos prácticos, solo evitamos repetir la llamada de red en
// ráfagas de clics/prefetch dentro de la misma ventana de tiempo.
// ------------------------------------------------------------------
type CachedUser = { user: any; expiresAt: number }
const userCache = new Map<string, CachedUser>()
const CACHE_TTL_MS = 30_000
const CACHE_MAX_ENTRIES = 500

function getAuthCacheKey(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter((c) => c.name.startsWith('sb-'))
    .map((c) => `${c.name}=${c.value}`)
    .join('&')
}

function getCachedUser(key: string) {
  if (!key) return undefined
  const hit = userCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.user
  if (hit) userCache.delete(key) // expiró, limpiar
  return undefined
}

function setCachedUser(key: string, user: any) {
  if (!key) return
  if (userCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = userCache.keys().next().value
    if (oldestKey) userCache.delete(oldestKey)
  }
  userCache.set(key, { user, expiresAt: Date.now() + CACHE_TTL_MS })
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const cacheKey = getAuthCacheKey(request)
  let user = getCachedUser(cacheKey)

  if (user === undefined) {
    const { data } = await supabase.auth.getUser()
    user = data.user
    if (user) setCachedUser(cacheKey, user)
  }

  const path = request.nextUrl.pathname

  // Redirecciones lógicas
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const rol = user.user_metadata?.rol

    // Si ya está logueado y va a login, mandarlo a su panel
    if (path === '/login' || path === '/') {
      if (rol === 'REPARTIDOR') return NextResponse.redirect(new URL('/repartidor', request.url))
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Proteger rutas de admin/oficina de los repartidores
    if (path.startsWith('/admin') && rol === 'REPARTIDOR') {
      return NextResponse.redirect(new URL('/repartidor', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}