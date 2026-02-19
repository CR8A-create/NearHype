// lib/getOrCreateUser.ts
// Auto-provisions a user in the database if they're authenticated via Clerk but don't have a DB record yet.
// This prevents 404 on all API routes for new users who haven't completed onboarding.

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type DbUser = typeof users.$inferSelect;

/**
 * Gets the current user from the database, creating their record if needed.
 * Returns null if the user is not authenticated.
 * This is the primary way API routes should get the current user.
 */
export async function getOrCreateUser(): Promise<DbUser | null> {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    // Try to find existing user
    let dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
    });

    if (dbUser) return dbUser;

    // User doesn't exist yet — auto-create from Clerk data
    try {
        const clerkUser = await currentUser();
        if (!clerkUser) return null;

        const [newUser] = await db.insert(users).values({
            clerkId: clerkId,
            email: clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@temp.local`,
            username: clerkUser.username || clerkUser.firstName || `user_${clerkId.slice(0, 8)}`,
            avatarUrl: clerkUser.imageUrl,
            onboardingCompleted: false,
        }).onConflictDoNothing().returning();

        if (newUser) return newUser;

        // If onConflictDoNothing didn't return (concurrent write), try to read again
        dbUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        return dbUser || null;
    } catch (error) {
        console.error("Error auto-creating user:", error);
        // Try one more time to read (in case it was a unique constraint race)
        dbUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });
        return dbUser || null;
    }
}
