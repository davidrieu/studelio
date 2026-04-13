"use client";

import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

/** Upload MP3 / M4A / MP4 (route `dictationMedia`). */
export const DictationMediaUploadButton = generateUploadButton<OurFileRouter>();
