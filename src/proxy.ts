import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/seller', '/checkout', '/orders', '/customer/dashboard', '/vendor/dashboard'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('localkart_auth_token')?.value;
  if (token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
  if (pathname.startsWith('/seller')) {
    url.searchParams.set('role', 'seller');
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/seller/:path*', '/checkout/:path*', '/orders/:path*', '/customer/dashboard/:path*', '/vendor/dashboard/:path*'],
};
