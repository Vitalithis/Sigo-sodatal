import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  //  EXCLUIR RUTAS COMPLETAMENTE DEL MIDDLEWARE
  if (path.startsWith('/login') || path.startsWith('/pendiente')) {
    return NextResponse.next();
  }

  //Lógica normal para el resto del proyecto 
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && path === '/') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};