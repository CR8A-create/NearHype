// app/api/users/route.ts - Buscar usuario por username

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users?username=xxx - Buscar usuario por username
export async function GET(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const username = req.nextUrl.searchParams.get("username");

        if (!username) {
            return NextResponse.json({ error: "Se requiere el parámetro username" }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.username, username),
            columns: {
                id: true,
                username: true,
                avatarUrl: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Error searching user:', error);
        return NextResponse.json(
            { error: "Error al buscar usuario" },
            { status: 500 }
        );
    }
}
