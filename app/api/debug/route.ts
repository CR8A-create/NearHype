// Temporary debug endpoint — DELETE AFTER FIXING
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const debug: Record<string, unknown> = {};

    try {
        // Step 1: Test auth()
        const authResult = await auth();
        debug.authResult = {
            userId: authResult.userId || null,
            sessionId: authResult.sessionId || null,
            has: !!authResult.userId,
        };

        if (!authResult.userId) {
            debug.conclusion = "auth() returned no userId — Clerk session not recognized server-side";
            return NextResponse.json(debug, { status: 200 });
        }

        // Step 2: Test currentUser()
        try {
            const clerkUser = await currentUser();
            debug.clerkUser = clerkUser
                ? {
                    id: clerkUser.id,
                    email: clerkUser.emailAddresses[0]?.emailAddress,
                    username: clerkUser.username,
                    firstName: clerkUser.firstName,
                }
                : null;
        } catch (e: unknown) {
            debug.clerkUserError = e instanceof Error ? e.message : String(e);
        }

        // Step 3: Test database connection
        try {
            const dbUser = await db.query.users.findFirst({
                where: eq(users.clerkId, authResult.userId),
            });
            debug.dbUser = dbUser
                ? { id: dbUser.id, username: dbUser.username, onboardingCompleted: dbUser.onboardingCompleted }
                : "NOT FOUND — user needs to be created";
        } catch (e: unknown) {
            debug.dbError = e instanceof Error ? e.message : String(e);
        }

        // Step 4: Check env vars (redacted)
        debug.envCheck = {
            hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
            publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10),
            hasSecretKey: !!process.env.CLERK_SECRET_KEY,
            secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10),
            hasProxyUrl: !!process.env.NEXT_PUBLIC_CLERK_PROXY_URL,
            proxyUrlValue: process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "NOT SET",
            afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "NOT SET",
            afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "NOT SET",
            signInFallback: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || "NOT SET",
            signUpFallback: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || "NOT SET",
        };

        debug.conclusion = "All checks passed";
    } catch (e: unknown) {
        debug.topLevelError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json(debug, { status: 200 });
}
