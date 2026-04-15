"use server";

import { cookies } from "next/headers";
import {
  A11Y_PREFERENCES_COOKIE,
  type A11yPreferences,
  serializeA11yCookie,
} from "@/lib/a11y-preferences";

export async function saveA11yPreferences(prefs: A11yPreferences) {
  const jar = cookies();
  const value = serializeA11yCookie(prefs);
  const isDefault = !value;
  if (isDefault) {
    jar.delete(A11Y_PREFERENCES_COOKIE);
    return;
  }
  jar.set(A11Y_PREFERENCES_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
}
