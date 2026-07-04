// app/api/user/profile/public/route.ts - Actualizar perfil público del usuario autenticado

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { updatePublicProfileSchema, parseBody } from "@/lib/validation";

// PUT /api/user/profile/public - Actualizar perfil público
export async function PUT(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const parsed = await parseBody(req, updatePublicProfileSchema);
        if (parsed.error) return parsed.error;
        const { bio, bannerUrl, publicInterests, profileVisibility, showLocation } = parsed.data;

        // Actualizar solo campos proporcionados
        const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

        if (bio !== undefined) updateData.bio = bio;
        if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
        if (publicInterests !== undefined) updateData.publicInterests = publicInterests;
        if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;
        if (showLocation !== undefined) updateData.showLocation = showLocation;

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, user.id))
            .returning({
                id: users.id,
                username: users.username,
                bio: users.bio,
                bannerUrl: users.bannerUrl,
                publicInterests: users.publicInterests,
                profileVisibility: users.profileVisibility,
                showLocation: users.showLocation,
            });

        return NextResponse.json({
            success: true,
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: "Error al actualizar perfil" },
            { status: 500 }
        );
    }
}
