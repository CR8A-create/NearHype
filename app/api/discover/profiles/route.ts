// app/api/discover/profiles/route.ts - Obtener perfiles para discover con matching

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userLocations, userInterests, communityMembers, profileSwipes, friendships, friendRequests } from "@/lib/db/schema";
import { eq, and, or, isNull, notInArray, sql, ne, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/discover/profiles - Obtener perfiles recomendados
export async function GET(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!currentUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Obtener ubicación del usuario
        const myLocation = await db.query.userLocations.findFirst({
            where: and(
                eq(userLocations.userId, currentUser.id),
                eq(userLocations.isCurrent, true)
            ),
        });

        // Obtener intereses del usuario
        const myInterests = await db.query.userInterests.findMany({
            where: eq(userInterests.userId, currentUser.id),
        });
        const myInterestTopics = myInterests.map(i => i.topic.toLowerCase());

        // IDs a excluir: usuario actual, ya swipeados, amigos, solicitudes pendientes
        const swipedProfiles = await db.query.profileSwipes.findMany({
            where: eq(profileSwipes.userId, currentUser.id),
            columns: { targetUserId: true },
        });
        const swipedIds = swipedProfiles.map(s => s.targetUserId);

        const friendsList = await db.query.friendships.findMany({
            where: or(
                eq(friendships.userId1, currentUser.id),
                eq(friendships.userId2, currentUser.id)
            ),
        });
        const friendIds = friendsList.map(f =>
            f.userId1 === currentUser.id ? f.userId2 : f.userId1
        );

        const pendingRequestsList = await db.query.friendRequests.findMany({
            where: or(
                eq(friendRequests.senderId, currentUser.id),
                eq(friendRequests.receiverId, currentUser.id)
            ),
        });
        const pendingIds = pendingRequestsList.map(r =>
            r.senderId === currentUser.id ? r.receiverId : r.senderId
        );

        const excludeIds = [currentUser.id, ...swipedIds, ...friendIds, ...pendingIds];

        // Obtener candidatos (usuarios con perfil público o amigos)
        let candidatesQuery = db
            .select({
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
                bio: users.bio,
                publicInterests: users.publicInterests,
                profileVisibility: users.profileVisibility,
                showLocation: users.showLocation,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(
                and(
                    ne(users.id, currentUser.id),
                    excludeIds.length > 1 ? notInArray(users.id, excludeIds) : sql`true`,
                    eq(users.isActive, true),
                    or(
                        eq(users.profileVisibility, "public"),
                        eq(users.profileVisibility, "friends")
                    )
                )
            )
            .limit(50); // Obtener 50 candidatos para scoring

        const candidates = await candidatesQuery;

        if (candidates.length === 0) {
            return NextResponse.json({
                profiles: [],
                message: "No hay más perfiles disponibles",
            });
        }

        // Calcular score de matching para cada candidato
        const scoredProfiles = await Promise.all(
            candidates.map(async (candidate) => {
                let score = 0;

                // 1. Score por intereses compartidos (máx 40 puntos)
                if (candidate.publicInterests && myInterestTopics.length > 0) {
                    const candidateInterests = (candidate.publicInterests as string[]).map(i => i.toLowerCase());
                    const commonInterests = candidateInterests.filter(i => myInterestTopics.includes(i));
                    score += Math.min(commonInterests.length * 10, 40);
                }

                // 2. Score por proximidad geográfica (máx 30 puntos)
                if (myLocation && candidate.showLocation) {
                    const candidateLocation = await db.query.userLocations.findFirst({
                        where: and(
                            eq(userLocations.userId, candidate.id),
                            eq(userLocations.isCurrent, true)
                        ),
                    });

                    if (candidateLocation) {
                        const distance = calculateDistance(
                            myLocation.latitude,
                            myLocation.longitude,
                            candidateLocation.latitude,
                            candidateLocation.longitude
                        );

                        if (distance <= 10) score += 30;
                        else if (distance <= 25) score += 20;
                        else if (distance <= 50) score += 10;

                        return {
                            ...candidate,
                            location: {
                                city: candidateLocation.city,
                                distance: Math.round(distance),
                            },
                            matchScore: score,
                        };
                    }
                }

                // 3. Score por comunidades compartidas (máx 30 puntos)
                const myCommunities = await db.query.communityMembers.findMany({
                    where: eq(communityMembers.userId, currentUser.id),
                    columns: { communityId: true },
                });
                const myCommunityIds = myCommunities.map(c => c.communityId);

                if (myCommunityIds.length > 0) {
                    const candidateCommunities = await db.query.communityMembers.findMany({
                        where: and(
                            eq(communityMembers.userId, candidate.id),
                            inArray(communityMembers.communityId, myCommunityIds)
                        ),
                    });
                    score += Math.min(candidateCommunities.length * 10, 30);
                }

                return {
                    ...candidate,
                    location: null,
                    matchScore: score,
                };
            })
        );

        // Ordenar por score descendente y tomar top 10
        const topProfiles = scoredProfiles
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 10);

        return NextResponse.json({
            profiles: topProfiles,
        });
    } catch (error) {
        console.error('Error fetching discover profiles:', error);
        return NextResponse.json(
            { error: "Error al cargar perfiles" },
            { status: 500 }
        );
    }
}

// Haversine formula para calcular distancia entre coordenadas
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}
