import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Pages qui n'ont pas besoin de connexion
  const isPublicPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si pas connecté et essaie d'aller sur le dashboard → login
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si déjà connecté et va sur login/register → dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};