"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return user;
}

export async function logoutUser() {
    const supabase = await createClient();
    await supabase.auth.signOut();
}
