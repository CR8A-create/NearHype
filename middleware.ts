import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';


// Rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhook(.*)',
]);

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }

    // Rate limiting básico para la API: por usuario autenticado o, en su
    // defecto, por IP. Ver lib/rateLimit.ts para límites y limitaciones.
    if (request.nextUrl.pathname.startsWith('/api')) {
        const { userId } = await auth();
        const key = userId
            ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? 'anon';
        const isWrite = !READ_METHODS.has(request.method);
        const result = checkRateLimit(key, isWrite);
        if (!result.ok) {
            return NextResponse.json(
                { error: 'Demasiadas peticiones. Espera un momento.' },
                { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
            );
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, including manifest.json
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
