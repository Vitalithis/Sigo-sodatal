import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const startTime = performance.now();
  const traceId = request.headers.get('x-trace-id') || crypto.randomUUID();
  const path = request.nextUrl.pathname;

  // Propagar trace_id hacia downstream (Server Components / Actions / Route Handlers)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  // Helper de ultra-bajo consumo para emitir el evento JSON a stdout y adjuntar header de correlación
  const finalize = (response: NextResponse, userId: string | null = null) => {
    response.headers.set('x-trace-id', traceId);
    const duration_ms = Number((performance.now() - startTime).toFixed(2));

    // Salida estructurada JSON en una sola línea a stdout (sin I/O de disco en Node.js)
    const logEvent = {
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      method: request.method,
      url: path + request.nextUrl.search,
      status: response.status,
      duration_ms,
      userId,
    };

    // console.log escribe directamente en stdout en Next.js (no bloqueante)
    console.log(JSON.stringify(logEvent));

    return response;
  };

  // 1. Rutas públicas excluidas de verificación
  if (path.startsWith('/login') || path.startsWith('/pendiente')) {
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // 2. Control de sesión con Better Auth
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  if (!isAuthenticated) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (isAuthenticated && path === '/') {
    return finalize(NextResponse.redirect(new URL('/admin', request.url)));
  }

  return finalize(
    NextResponse.next({ request: { headers: requestHeaders } }),
    sessionCookie ? 'authenticated_session' : null
  );
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};