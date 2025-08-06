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

export async function getTodaysCalls() {
    const supabase = await createClient();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    
    const { data: calls } = await supabase
        .from("calls")
        .select("*")
        .gte("call_start_time", startOfDay)
        .lt("call_start_time", endOfDay);
    return calls || [];
}

export async function getMoodStats() {
    const supabase = await createClient();
    const { data: calls } = await supabase.from("calls").select("response_data");
    
    if (!calls || calls.length === 0) {
        return { total: 0, positive: 0 };
    }
    
    const total = calls.length;
    const positive = calls.filter(
        call => call.response_data?.overall_mood === "positive"
    ).length;
    
    return { total, positive };
}
