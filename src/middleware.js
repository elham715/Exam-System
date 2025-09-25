import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  // Debugging log
  console.log('Found NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Found NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => req.cookies.get(name)?.value, set: (name, value, options) => res.cookies.set({ name, value, ...options }), remove: (name, options) => res.cookies.set({ name, value: '', ...options }) } }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (req.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
  ],
};
