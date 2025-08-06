"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Patient, VoiceType } from "@/types/business";

export default function EditPatientPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        age: "",
        location: "",
        preferred_call_time: "",
        phone_number: "",
        voice: "nova" as VoiceType,
    });

    useEffect(() => {
        fetchPatient();
    }, [patientId]);

    const fetchPatient = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.from("patients").select("*").eq("id", patientId).single();

        if (error) {
            setError("Failed to fetch patient");
            console.error(error);
        } else if (data) {
            setPatient(data);
            setFormData({
                first_name: data.first_name,
                last_name: data.last_name,
                age: data.age?.toString() || "",
                location: data.location || "",
                preferred_call_time: data.preferred_call_time || "",
                phone_number: data.phone_number,
                voice: data.voice || "nova",
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();

        const { error: updateError } = await supabase
            .from("patients")
            .update({
                ...formData,
                age: formData.age ? parseInt(formData.age) : null,
            })
            .eq("id", patientId);

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
        } else {
            router.push("/dashboard/patients");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
            return;
        }

        setDeleting(true);
        const supabase = createClient();

        const { error: deleteError } = await supabase.from("patients").delete().eq("id", patientId);

        if (deleteError) {
            setError(deleteError.message);
            setDeleting(false);
        } else {
            router.push("/dashboard/patients");
        }
    };

    if (!patient) {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600">Loading patient...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <Link
                        href="/dashboard/patients"
                        className="inline-flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Patients
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Patient</h1>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleting ? "Deleting..." : "Delete Patient"}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    required
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    required
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                                    Age
                                </label>
                                <input
                                    type="number"
                                    id="age"
                                    name="age"
                                    min="1"
                                    max="120"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                    Location (City, State)
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g., New York, NY"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    id="phone_number"
                                    name="phone_number"
                                    required
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="+1 (555) 123-4567"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="preferred_call_time"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Preferred Call Time
                                </label>
                                <input
                                    type="time"
                                    id="preferred_call_time"
                                    name="preferred_call_time"
                                    value={formData.preferred_call_time}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
                                Agent Voice
                            </label>
                            <select
                                id="voice"
                                name="voice"
                                value={formData.voice}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="alloy">Alloy - Neutral and balanced</option>
                                <option value="echo">Echo - Warm and conversational</option>
                                <option value="fable">Fable - Expressive and animated</option>
                                <option value="onyx">Onyx - Deep and authoritative</option>
                                <option value="nova">Nova - Friendly and upbeat (Default)</option>
                                <option value="shimmer">Shimmer - Soft and gentle</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500">
                                Choose a voice that the patient will find most comfortable and easy to understand.
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <Link
                                href="/dashboard/patients"
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
