// app/api/notifications/route.ts - GET para listar notificaciones

import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
