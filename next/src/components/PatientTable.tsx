"use client";

import Link from "next/link";
import { Phone, Edit, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Patient } from "@/types/business";

interface PatientTableProps {
    patients: Patient[];
}

export default function PatientTable({ patients }: PatientTableProps) {
    const [callingPatientId, setCallingPatientId] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);
    const [callSuccess, setCallSuccess] = useState<string | null>(null);

    const triggerCall = async (patient: Patient) => {
        setCallingPatientId(patient.id);
        setCallError(null);
        setCallSuccess(null);

        try {
            const response = await fetch("/api/calls/trigger", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    patientId: patient.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to initiate call");
            }

            setCallSuccess(`Call initiated to ${patient.first_name} ${patient.last_name}`);

            // Clear success message after 5 seconds
            setTimeout(() => {
                setCallSuccess(null);
            }, 5000);
        } catch (error: any) {
            console.error("Error triggering call:", error);
            setCallError(error.message || "Failed to initiate call");

            // Clear error after 5 seconds
            setTimeout(() => {
                setCallError(null);
            }, 5000);
        } finally {
            setCallingPatientId(null);
        }
    };

    return (
        <>
            {/* Status Messages */}
            {callError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{callError}</div>
            )}

            {callSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                    {callSuccess}
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Patient
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Age
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Voice
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Preferred Call Time
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map((patient: Patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {patient.first_name} {patient.last_name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{patient.age || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{patient.location || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{patient.phone_number}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {patient.voice
                                            ? patient.voice.charAt(0).toUpperCase() + patient.voice.slice(1)
                                            : "Nova"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{patient.preferred_call_time || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => triggerCall(patient)}
                                            disabled={callingPatientId === patient.id}
                                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Trigger Call"
                                        >
                                            {callingPatientId === patient.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Phone className="w-5 h-5" />
                                            )}
                                        </button>
                                        <Link
                                            href={`/dashboard/patients/${patient.id}`}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Edit Patient"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
