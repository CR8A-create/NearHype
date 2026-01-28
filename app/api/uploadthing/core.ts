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
        .onUploadComplete(() => { }),

    // Uploader de imágenes para comentarios y chat
    messageImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("No autenticado");
            return { userId: user.id };
        })
        .onUploadComplete(() => { }),

    // Uploader para avatares de comunidades
    communityAvatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await currentUser();
            if (!user) throw new Error("No autenticado");
            return { userId: user.id };
        })
        .onUploadComplete(() => { }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
