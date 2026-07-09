import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  
  // SOLUCIÓN VIABLE: Detectar toda navegación interna de Next.js (incluyendo clics)
  const isNextRouting = 
    request.headers.get('RSC') === '1' || 
    request.headers.get('Next-Router-Prefetch') === '1' || 
    request.headers.get('Purpose') === 'prefetch';

  let user = null;

  if (isNextRouting) {
    // Navegación SPA interna: lectura ultra rápida de la cookie local
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user || null;
  } else {
    // Hard Reload / Primera visita: petición de red real para máxima seguridad
    const { data } = await supabase.auth.getUser();
    user = data.user || null;
  }

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const rol = user.user_metadata?.rol;

    if (path === '/login' || path === '/') {
      if (rol === 'REPARTIDOR') return NextResponse.redirect(new URL('/repartidor', request.url));
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (path.startsWith('/admin')) {
      if (rol === 'REPARTIDOR') {
        return NextResponse.redirect(new URL('/repartidor', request.url));
      }

      if (rol === 'OFICINA') {
        const forbiddenForOficina = path.startsWith('/admin/choferes') || path.includes('/comisiones');
        if (forbiddenForOficina) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }
    
    if (path.startsWith('/repartidor') && rol !== 'REPARTIDOR') {
         return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};