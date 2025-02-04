import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { getMockUser } from './lib/mockAuth';
import { NextRequest, NextResponse, NextFetchEvent } from 'next/server';

const isPreviewEnvironment = () => {
  return process.env.AZURE_STATIC_WEBAPPS_ENVIRONMENT === 'preview' || !process.env.AUTH0_BASE_URL;
}

export function middleware(request: NextRequest, event: NextFetchEvent) {
  if (isPreviewEnvironment()) {
    const mockEmail = request.cookies.get('mockEmail')?.value;
    if (mockEmail) {
      const mockUser = getMockUser(mockEmail);
      if (mockUser) {
        const response = NextResponse.next();
        response.headers.set('x-auth-user', JSON.stringify(mockUser));
        return response;
      }
    }
    return NextResponse.redirect(new URL('/mock-login', request.nextUrl.origin));
  }

  const handler = withMiddlewareAuthRequired();
  return handler(request, event);
}

export const config = {
  matcher: [
    // Add routes that require authentication
    '/protected/:path*',
    '/api/protected/:path*',
  ],
}; 