// app/api/notifications/route.ts - GET para listar notificaciones

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Buscar usuario
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Obtener notificaciones (últimas 50)
        const userNotifications = await db.query.notifications.findMany({
            where: eq(notifications.userId, user.id),
            orderBy: [desc(notifications.createdAt)],
            limit: 50,
        });

        // Contar no leídas
        const unreadCount = userNotifications.filter(n => !n.isRead).length;

        return NextResponse.json({
            notifications: userNotifications,
            unreadCount,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: "Error al obtener notificaciones" },
            { status: 500 }
        );
    }
}
