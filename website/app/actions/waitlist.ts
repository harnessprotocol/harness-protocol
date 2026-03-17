"use server";

import { getSupabaseClient } from "@/lib/supabase";

export async function joinWaitlist(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({ email });

    if (error) {
      if (error.code === "23505") {
        return { success: true, message: "You're already on the list!" };
      }
      return { success: false, message: "Something went wrong. Please try again." };
    }

    return { success: true, message: "You're on the list! We'll be in touch." };
  } catch {
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
