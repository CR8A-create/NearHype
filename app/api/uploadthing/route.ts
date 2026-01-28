import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes para Next.js App Router
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
});
