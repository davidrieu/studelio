"use server";

import { cookies } from "next/headers";
import { STUDENT_THEME_COOKIE, type StudelioStudentTheme } from "@/lib/student-ui-theme";

export async function setStudelioStudentTheme(theme: StudelioStudentTheme) {
  cookies().set(STUDENT_THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
}
