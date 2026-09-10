import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  if (!isAuthenticated && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && (path === '/login' || path === '/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};