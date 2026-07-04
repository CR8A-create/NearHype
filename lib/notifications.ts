// lib/notifications.ts - Helper para crear notificaciones

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type NotificationType =
    | 'chat_reply'       // Alguien respondió a tu mensaje en chat
    | 'post_comment'     // Alguien comentó en tu post
    | 'comment_reply'    // Alguien respondió a tu comentario
    | 'mention'          // Te mencionaron (@usuario)
    | 'community_action' // Fuiste expulsado/promovido en comunidad
    | 'post_upvote';     // Tu post recibió muchos upvotes

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl: string;
    metadata?: {
        fromUserId?: string;
        fromUsername?: string;
        fromAvatarUrl?: string;
        communitySlug?: string;
        postId?: string;
        commentId?: string;
        messageId?: string;
    };
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        const [notification] = await db.insert(notifications).values({
            userId: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            linkUrl: params.linkUrl,
            isRead: false,
            metadata: params.metadata || {},
        }).returning();

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

// Helper para marcar como leída
export async function markAsRead(notificationId: string) {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, notificationId));
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

// Helper para marcar todas como leídas
export async function markAllAsRead(userId: string) {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, userId));
        return true;
    } catch (error) {
        console.error('Error marking all as read:', error);
        return false;
    }
}

// Helper para contar no leídas
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const result = await db.query.notifications.findMany({
            where: (notifications, { eq, and }) =>
                and(
                    eq(notifications.userId, userId),
                    eq(notifications.isRead, false)
                ),
        });
        return result.length;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}
