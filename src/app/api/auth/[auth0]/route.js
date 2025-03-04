// app/api/auth/[auth0]/route.js
import { handleAuth } from '@auth0/nextjs-auth0';

// Export an async function that handles the auth route
export async function GET(req, { params }) {
  const auth = handleAuth();
  return auth(req, { params });
}