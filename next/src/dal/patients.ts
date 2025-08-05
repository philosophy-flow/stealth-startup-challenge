"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPatients() {
    const supabase = await createClient();
    const { data: patients } = await supabase.from("patients").select("*");
    return patients || [];
}

export async function getCalls() {
    const supabase = await createClient();
    const { data: calls } = await supabase.from("calls").select("*");
    return calls || [];
}
