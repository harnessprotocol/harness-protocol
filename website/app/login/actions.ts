"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null;

  if (password !== process.env.PREVIEW_PASSWORD) {
    return "Invalid password.";
  }

  const cookieStore = await cookies();
  cookieStore.set("hp-preview-auth", "authenticated", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  redirect(redirectTo || "/docs");
}
