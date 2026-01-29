
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests } from "@/lib/db/schema";
import { eq, and, ne, inArray, sql, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        username: string;
    }>;
};

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();
        const { username } = await params;

        // 1. Obtener el usuario target para saber sus intereses
        const targetUser = await db.query.users.findFirst({
            where: eq(users.username, username),
            with: {
                interests: true,
            },
            columns: {
                id: true,
            }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const userInterestsList = targetUser.interests.map(i => i.topic);

        if (userInterestsList.length === 0) {
            return NextResponse.json({ similarUsers: [] });
        }

        // 2. Buscar usuarios que tengan al menos uno de esos intereses
        // Usamos una subquery o join para encontrar coincidencias
        // NOTA: Para MVP hacemos una query simple buscando coincidencias en userInterests

        const similarUsers = await db
            .select({
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
                matchCount: sql<number>`count(${userInterests.topic})`.mapWith(Number),
            })
            .from(users)
            .innerJoin(userInterests, eq(users.id, userInterests.userId))
            .where(
                and(
                    ne(users.id, targetUser.id), // No incluir al propio usuario
                    inArray(userInterests.topic, userInterestsList)
                )
            )
            .groupBy(users.id, users.username, users.avatarUrl)
            .orderBy(desc(sql`count(${userInterests.topic})`))
            .limit(10);

        return NextResponse.json({ similarUsers });
    } catch (error) {
        console.error("Error finding similar users:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
