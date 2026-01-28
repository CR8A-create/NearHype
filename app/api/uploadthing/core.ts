import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";

const f = createUploadthing();

// FileRouter para nuestra app - define qué tipos de archivos y quién puede subirlos
export const ourFileRouter = {
    // Uploader de imágenes para posts
    postImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("No autenticado");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload completo para usuario:", metadata.userId);
            console.log("URL del archivo:", file.url);
            return { uploadedBy: metadata.userId, url: file.url };
        }),

    // Uploader de imágenes para comentarios y chat
    messageImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("No autenticado");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Imagen de mensaje subida por:", metadata.userId);
            console.log("URL:", file.url);
            return { uploadedBy: metadata.userId, url: file.url };
        }),

    // Uploader para avatares de comunidades
    communityAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("No autenticado");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Avatar de comunidad subido");
            return { url: file.url };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
