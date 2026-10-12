import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Pages publiques accessible sans connexion
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si pas connecté et tente d'accéder à une page privée -> redirection login
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si déjà connecté et va sur login/register -> redirection dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 🔴 CORRECTION CRUCIALE :
     * Exclure explicitement toutes les images (.jpg, .png, .svg, .json, .ico, etc.)
     * pour que le Middleware ne les redirige jamais !
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)',
  ],
};