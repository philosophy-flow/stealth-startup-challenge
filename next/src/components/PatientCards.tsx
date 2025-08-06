"use client";

import Link from "next/link";
import { Phone, Edit, User, MapPin, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Patient } from "@/types/business";

interface PatientCardsProps {
    patients: Patient[];
}

export default function PatientCards({ patients }: PatientCardsProps) {
    const [callingPatientId, setCallingPatientId] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);
    const [callSuccess, setCallSuccess] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [patientToCall, setPatientToCall] = useState<Patient | null>(null);

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
            setShowConfirmModal(false);
            setPatientToCall(null);

            setTimeout(() => {
                setCallSuccess(null);
            }, 5000);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Error triggering call:", error);
            setCallError(error.message || "Failed to initiate call");

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

            {/* Confirmation Modal */}
            {showConfirmModal && patientToCall && (
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowConfirmModal(false)}
                >
                    <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Call</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to call {patientToCall.first_name}?
                            {patientToCall.location && (
                                <span className="block mt-1">
                                    They are located in <span className="font-bold">{patientToCall.location}</span>, so
                                    keep time zone differences in mind when reaching out.
                                </span>
                            )}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => triggerCall(patientToCall)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Call {patientToCall.first_name}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Card View */}
            <div className="space-y-4 lg:hidden">
                {patients.map((patient: Patient) => (
                    <div key={patient.id} className="bg-white rounded-lg shadow p-4">
                        {/* Header with name and actions */}
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {patient.first_name} {patient.last_name}
                                </h3>
                                <a
                                    href={`tel:${patient.phone_number}`}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    {patient.phone_number}
                                </a>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        setPatientToCall(patient);
                                        setShowConfirmModal(true);
                                    }}
                                    disabled={callingPatientId === patient.id}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                    aria-label="Trigger Call"
                                >
                                    {callingPatientId === patient.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Phone className="w-5 h-5" />
                                    )}
                                </button>
                                <Link
                                    href={`/dashboard/patients/${patient.id}`}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    aria-label="Edit Patient"
                                >
                                    <Edit className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>

                        {/* Patient details */}
                        <div className="space-y-2 text-sm text-gray-600">
                            {patient.age && (
                                <div className="flex items-center">
                                    <User className="w-4 h-4 mr-2" />
                                    Age: {patient.age}
                                </div>
                            )}
                            {patient.location && (
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {patient.location}
                                </div>
                            )}
                            {patient.preferred_call_time && (
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2" />
                                    Preferred: {patient.preferred_call_time}
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                                Voice:{" "}
                                {patient.voice
                                    ? patient.voice.charAt(0).toUpperCase() + patient.voice.slice(1)
                                    : "Nova"}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
