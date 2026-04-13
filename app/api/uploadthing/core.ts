import { auth } from "@/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  /** MP3, M4A, etc. + MP4 (piste audio / vidéo lue dans l’app élève). */
  dictationMedia: f({
    audio: { maxFileSize: "64MB", maxFileCount: 1 },
    video: { maxFileSize: "256MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== "ADMIN") {
        throw new Error("Réservé aux administrateurs.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { uploadedBy: "admin", url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
