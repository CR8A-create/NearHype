// lib/getOrCreateUser.ts
// Auto-provisions a user in the database if they're authenticated via Clerk but don't have a DB record yet.
// Handles dev→prod migration: if a user exists with the same email but different clerkId, updates the clerkId.

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

    // Try to find existing user by clerkId
    let dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
    });

    if (dbUser) return dbUser;

    // User doesn't exist with this clerkId — could be dev→prod migration
    try {
        const clerkUser = await currentUser();
        if (!clerkUser) return null;

        const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@temp.local`;
        const username = clerkUser.username || clerkUser.firstName || `user_${clerkId.slice(0, 8)}`;

        // Check if a user with the same email already exists (dev→prod migration)
        const existingByEmail = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingByEmail) {
            // Update the existing user's clerkId to the new production one
            const [updated] = await db
                .update(users)
                .set({
                    clerkId: clerkId,
                    avatarUrl: clerkUser.imageUrl,
                    lastLogin: new Date(),
                })
                .where(eq(users.id, existingByEmail.id))
                .returning();
            return updated || existingByEmail;
        }

        // No existing user at all — create fresh
        const [newUser] = await db.insert(users).values({
            clerkId: clerkId,
            email: email,
            username: username,
            avatarUrl: clerkUser.imageUrl,
            onboardingCompleted: false,
        }).onConflictDoNothing().returning();

        if (newUser) return newUser;

        // If onConflictDoNothing didn't return (concurrent write or username conflict), try username variants
        for (let i = 1; i <= 5; i++) {
            try {
                const [retryUser] = await db.insert(users).values({
                    clerkId: clerkId,
                    email: email,
                    username: `${username}_${i}`,
                    avatarUrl: clerkUser.imageUrl,
                    onboardingCompleted: false,
                }).returning();
                if (retryUser) return retryUser;
            } catch {
                continue;
            }
        }

        // Last resort: try to read again
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
