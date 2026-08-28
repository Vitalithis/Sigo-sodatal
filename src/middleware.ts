import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const t0 = Date.now();

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

  const isNextRouting =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    request.headers.get('Purpose') === 'prefetch' ||
    request.nextUrl.searchParams.has('_rsc');

  let user = null;
  const tAuthStart = Date.now();

  if (isNextRouting) {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user || null;
  } else {
    const { data } = await supabase.auth.getUser();
    user = data.user || null;
  }

  const tAuthEnd = Date.now();
  //console.log(`[MW] ${path} | isNextRouting=${isNextRouting} | auth=${tAuthEnd - tAuthStart}ms | total-hasta-auth=${tAuthEnd - t0}ms`);

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const rol = user.user_metadata?.rol;
    const esPendiente = !rol || rol === 'PENDIENTE';

    // Punto de entrada (login o raíz): redirige según estado
    if (path === '/login' || path === '/') {
      if (esPendiente) return NextResponse.redirect(new URL('/pendiente', request.url));
      if (rol === 'REPARTIDOR') return NextResponse.redirect(new URL('/repartidor', request.url));
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Sin rol asignado: solo puede estar en /pendiente
    if (esPendiente && path !== '/pendiente') {
      return NextResponse.redirect(new URL('/pendiente', request.url));
    }

    // Ya tiene rol: no debería quedarse varado en /pendiente
    if (!esPendiente && path === '/pendiente') {
      if (rol === 'REPARTIDOR') return NextResponse.redirect(new URL('/repartidor', request.url));
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (path.startsWith('/admin')) {
      if (rol === 'REPARTIDOR') {
        return NextResponse.redirect(new URL('/repartidor', request.url));
      }

      if (rol === 'OFICINA') {
        const forbiddenForOficina =
          path.startsWith('/admin/flota') ||
          path.startsWith('/admin/roles') ||
          path.includes('/comisiones');
        if (forbiddenForOficina) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }

    if (path.startsWith('/repartidor') && rol !== 'REPARTIDOR') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

 // console.log(`[MW] ${path} | total-completo=${Date.now() - t0}ms`);
//console.log(`[MW] ${path} | headers=${JSON.stringify(Object.fromEntries(request.headers))}`);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};