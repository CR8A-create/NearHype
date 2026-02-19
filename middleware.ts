import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhook(.*)',
]);

// Rutas API (devolver 401 JSON en vez de redirect)
const isApiRoute = createRouteMatcher([
    '/api(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        try {
            await auth.protect();
        } catch {
            // Para rutas API, devolver 401 JSON en lugar de redirect HTML
            if (isApiRoute(request)) {
                return NextResponse.json(
                    { error: "No autenticado" },
                    { status: 401 }
                );
            }
            throw new Error("Unauthorized");
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
