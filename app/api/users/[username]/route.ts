// app/api/users/[username]/route.ts - Ver perfil público de usuario

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendships, userLocations, communityMembers } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        username: string;
    }>;
};

// GET /api/users/[username] - Ver perfil público
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();
        const { username } = await params;

        // Buscar el usuario por username
        const targetUser = await db.query.users.findFirst({
            where: eq(users.username, username),
            with: {
                interests: true,
                locations: {
                    where: (locations, { eq }) => eq(locations.isCurrent, true),
                    limit: 1,
                }
            },
            columns: {
                id: true,
                username: true,
                avatarUrl: true,
                bio: true,
                bannerUrl: true,
                profileVisibility: true,
                showLocation: true,
                createdAt: true,
            },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Verificar permisos según visibilidad del perfil
        let currentUserId: string | null = null;

        if (clerkId) {
            const currentUser = await db.query.users.findFirst({
                where: eq(users.clerkId, clerkId),
                columns: { id: true }
            });
            currentUserId = currentUser?.id || null;
        }

        // Si no es perfil público, verificar permisos
        if (targetUser.profileVisibility !== "public") {
            if (!currentUserId) {
                // Usuario no autenticado no puede ver perfiles privados/solo amigos
                return NextResponse.json(
                    { error: "Este perfil es privado" },
                    { status: 403 }
                );
            }

            if (targetUser.profileVisibility === "private" && currentUserId !== targetUser.id) {
                return NextResponse.json(
                    { error: "Este perfil es privado" },
                    { status: 403 }
                );
            }

            if (targetUser.profileVisibility === "friends") {
                // Verificar si son amigos
                const areFriends = await db.query.friendships.findFirst({
                    where: or(
                        and(
                            eq(friendships.userId1, currentUserId),
                            eq(friendships.userId2, targetUser.id)
                        ),
                        and(
                            eq(friendships.userId1, targetUser.id),
                            eq(friendships.userId2, currentUserId)
                        )
                    ),
                });

                if (!areFriends && currentUserId !== targetUser.id) {
                    return NextResponse.json(
                        { error: "Este perfil solo es visible para amigos" },
                        { status: 403 }
                    );
                }
            }
        }

        // Obtener ubicación si showLocation está activado
        // La ubicación ya viene en targetUser.locations[0] gracias al 'with' en la query principal
        const location = targetUser.showLocation && targetUser.locations[0]
            ? { city: targetUser.locations[0].city, countryCode: targetUser.locations[0].countryCode }
            : null;


        // Contar amigos
        const friendsCount = await db.$count(
            friendships,
            or(
                eq(friendships.userId1, targetUser.id),
                eq(friendships.userId2, targetUser.id)
            )
        );

        // Contar comunidades
        const communitiesCount = await db.$count(
            communityMembers,
            eq(communityMembers.userId, targetUser.id)
        );

        // Verificar relación con usuario actual
        let relationshipStatus = "none"; // 'none', 'friends', 'pending_sent', 'pending_received'
        if (currentUserId && currentUserId !== targetUser.id) {
            const friendship = await db.query.friendships.findFirst({
                where: or(
                    and(
                        eq(friendships.userId1, currentUserId),
                        eq(friendships.userId2, targetUser.id)
                    ),
                    and(
                        eq(friendships.userId1, targetUser.id),
                        eq(friendships.userId2, currentUserId)
                    )
                ),
            });
            if (friendship) {
                relationshipStatus = "friends";
            }
        }

        return NextResponse.json({
            user: {
                ...targetUser,
                location,
                stats: {
                    friends: friendsCount,
                    communities: communitiesCount,
                },
                relationship: relationshipStatus,
                isOwnProfile: currentUserId === targetUser.id,
            },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: "Error al cargar perfil" },
            { status: 500 }
        );
    }
}
