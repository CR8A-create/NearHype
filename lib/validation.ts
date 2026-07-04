// lib/validation.ts
// Esquemas Zod y helper de validación para los bodies de las rutas API.
// Los máximos se alinean con las columnas de lib/db/schema.ts.

import { z } from "zod";
import { NextResponse } from "next/server";

// URL opcional: acepta undefined, null o "" (los clientes actuales envían
// cualquiera de los tres cuando no hay valor) y los normaliza a undefined.
const optionalUrl = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().url("URL inválida").max(2048).optional()
);

const optionalUuid = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid("Identificador inválido").optional()
);

/** POST /api/communities/[slug]/posts */
export const createPostSchema = z
    .object({
        title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(300, "El título no puede superar 300 caracteres"),
        content: z.string().max(40_000, "El contenido es demasiado largo").optional().nullable(),
        contentType: z.enum(["text", "image", "link"]).optional(),
        mediaUrl: optionalUrl,
        linkUrl: optionalUrl,
    })
    .refine((d) => d.contentType !== "link" || !!d.linkUrl, {
        message: "Debes proporcionar una URL para posts de tipo link",
    });

/** PATCH /api/posts/[id] */
export const updatePostSchema = z.object({
    title: z.string().trim().min(1, "El título es obligatorio").max(300, "El título no puede superar 300 caracteres"),
    content: z.string().max(40_000, "El contenido es demasiado largo").optional().nullable(),
    mediaUrl: optionalUrl,
    linkUrl: optionalUrl,
});

/** POST /api/posts/[id]/comments */
export const createCommentSchema = z.object({
    content: z.string().trim().min(1, "El comentario no puede estar vacío").max(10_000, "El comentario es demasiado largo"),
    parentCommentId: optionalUuid,
    mediaUrl: optionalUrl,
    linkUrl: optionalUrl,
});

/** POST /api/communities/[slug]/messages */
export const createMessageSchema = z.object({
    content: z.string().trim().min(1, "El mensaje no puede estar vacío").max(1000, "Mensaje inválido (máx 1000 caracteres)"),
    replyToId: optionalUuid,
    imageUrl: optionalUrl,
});

/** POST /api/dms/[userId] */
export const createDmSchema = z.object({
    content: z.string().trim().min(1, "El mensaje no puede estar vacío").max(4000, "El mensaje es demasiado largo"),
    mediaUrl: optionalUrl,
});

/** POST /api/communities */
export const createCommunitySchema = z.object({
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "El nombre no puede superar 100 caracteres"),
    description: z.string().max(2000, "La descripción es demasiado larga").optional().nullable(),
    category: z.string().trim().min(1, "Debes seleccionar una categoría").max(50),
    iconUrl: optionalUrl,
});

/** POST /api/user/onboarding */
export const onboardingSchema = z
    .object({
        interests: z.array(z.string().trim().min(1).max(100)).min(3, "Debes seleccionar al menos 3 intereses").max(30, "Demasiados intereses"),
        location: z
            .object({
                city: z.string().trim().max(200).optional(),
                lat: z.number().optional(),
                lon: z.number().optional(),
            })
            .optional()
            .nullable(),
        locationConsent: z.boolean().optional(),
    })
    .refine((d) => !(d.location && d.locationConsent) || !!d.location?.city, {
        message: "La ubicación debe incluir una ciudad",
    });

/** PUT /api/user/profile */
export const updateProfileSchema = z.object({
    interests: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    city: z.string().trim().max(200).optional(),
    radiusKm: z.number().min(1).max(500).optional(),
    bio: z.string().max(500, "La bio no puede exceder 500 caracteres").optional(),
    avatarUrl: optionalUrl,
});

/** PATCH /api/user/profile/public */
export const updatePublicProfileSchema = z.object({
    bio: z.string().max(500, "La bio no puede exceder 500 caracteres").optional(),
    bannerUrl: optionalUrl,
    publicInterests: z.array(z.string().trim().max(100)).max(10, "Los intereses deben ser un array con máximo 10 elementos").optional(),
    profileVisibility: z.enum(["public", "friends", "private"], { message: "Visibilidad de perfil inválida" }).optional(),
    showLocation: z.boolean().optional(),
});

/** PUT /api/user/preferences */
export const updatePreferencesSchema = z.object({
    theme: z.record(z.string(), z.unknown()).or(z.string().max(100)),
});

/** POST /api/user/interests/weight */
export const interestWeightSchema = z.object({
    topic: z.string().trim().min(1, "topic es requerido").max(100),
    action: z.literal("click", { message: "action debe ser 'click'" }),
});

/** POST /api/friends/request */
export const friendRequestSchema = z.object({
    receiverUsername: z.string().trim().min(1, "Falta el username del destinatario").max(50),
});

/** POST /api/dms */
export const startDmSchema = z.object({
    targetUsername: z.string().trim().min(1, "Falta el username").max(50),
});

/** POST /api/calls */
export const createCallSchema = z.object({
    calleeId: z.string().uuid("calleeId requerido"),
    callType: z.enum(["video", "audio"]).default("video"),
});

/** POST /api/calls/[roomId] */
export const callActionSchema = z.object({
    action: z.enum(["join", "reject", "end"], { message: "Acción inválida" }),
    callDuration: z.number().int().min(0).max(60 * 60 * 24).optional(),
});

/** POST /api/posts/[id]/vote */
export const voteSchema = z.object({
    voteType: z.enum(["upvote", "downvote"], { message: "Tipo de voto inválido. Usa 'upvote' o 'downvote'" }),
});

/** PATCH /api/communities/[slug] */
export const updateCommunitySchema = z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
    description: z.string().max(2000).optional().nullable(),
    iconUrl: optionalUrl,
    category: z.string().trim().max(50).optional().nullable(),
});

/** POST /api/discover/profiles/[userId] */
export const swipeSchema = z.object({
    action: z.enum(["like", "skip"], { message: "Acción inválida" }),
});

/**
 * Parsea y valida el body JSON de una request.
 * Devuelve `{ data }` si es válido o `{ error }` con una NextResponse 400 lista para retornar.
 */
export async function parseBody<S extends z.ZodType>(
    req: Request,
    schema: S
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return { error: NextResponse.json({ error: "JSON inválido" }, { status: 400 }) };
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
        const msg = result.error.issues[0]?.message || "Datos inválidos";
        return { error: NextResponse.json({ error: msg }, { status: 400 }) };
    }
    return { data: result.data };
}
