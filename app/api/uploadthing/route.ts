import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes para Next.js App Router con configuración explícita
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    config: {
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/uploadthing`,
        logLevel: "Info",
    },
});
