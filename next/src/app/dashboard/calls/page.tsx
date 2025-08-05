"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Phone, Calendar, Clock, FileText, X } from "lucide-react";
import type { Call, Patient } from "@/types/business";

interface CallWithPatient extends Call {
    patient: Patient;
}

export default function CallsPage() {
    const [calls, setCalls] = useState<CallWithPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<CallWithPatient | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchCalls();
    }, []);

    const fetchCalls = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("calls")
            .select(
                `
        *,
        patient:patients (*)
      `
            )
            .order("call_date", { ascending: false });

        if (error) {
            console.error("Error fetching calls:", error);
        } else if (data) {
            setCalls(data as CallWithPatient[]);
        }
        setLoading(false);
    };

    const openCallDetails = (call: CallWithPatient) => {
        setSelectedCall(call);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedCall(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800";
            case "in_progress":
                return "bg-blue-100 text-blue-800";
            case "failed":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatDuration = (seconds: number | undefined) => {
        if (!seconds) return "-";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Call History</h1>
                <p className="text-gray-600 mt-2">View all patient calls and their details</p>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-600">Loading calls...</p>
                </div>
            ) : calls.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No calls yet</h2>
                    <p className="text-gray-600">Calls will appear here once you trigger them from the patients page</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date & Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mood
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {calls.map((call) => (
                                <tr key={call.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {call.patient.first_name} {call.patient.last_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {format(new Date(call.call_date), "MMM d, yyyy")}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {call.call_start_time
                                                ? format(new Date(call.call_start_time), "h:mm a")
                                                : "-"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {formatDuration(call.call_duration)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${getStatusColor(
                                                call.status
                                            )}`}
                                        >
                                            {call.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {call.response_data?.overall_mood || "-"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openCallDetails(call)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Call Details Modal */}
            {showModal && selectedCall && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Call Details</h2>
                                <p className="text-gray-600 mt-1">
                                    {selectedCall.patient.first_name} {selectedCall.patient.last_name} -{" "}
                                    {format(new Date(selectedCall.call_date), "MMM d, yyyy")}
                                </p>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Call Information */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Call Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm">
                                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="text-gray-600">Date:</span>
                                            <span className="ml-2 text-gray-900">
                                                {format(new Date(selectedCall.call_date), "MMMM d, yyyy")}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="text-gray-600">Time:</span>
                                            <span className="ml-2 text-gray-900">
                                                {selectedCall.call_start_time
                                                    ? format(new Date(selectedCall.call_start_time), "h:mm a")
                                                    : "-"}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="ml-2 text-gray-900">
                                                {formatDuration(selectedCall.call_duration)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Response Data</h3>
                                    <div className="space-y-2">
                                        <div className="text-sm">
                                            <span className="text-gray-600">Overall Mood:</span>
                                            <span className="ml-2 text-gray-900 font-medium">
                                                {selectedCall.response_data?.overall_mood || "Not recorded"}
                                            </span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-600">Game Result:</span>
                                            <span className="ml-2 text-gray-900">
                                                {selectedCall.response_data?.game_result || "Not played"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Today's Agenda */}
                            {selectedCall.response_data?.todays_agenda && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Today's Agenda</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-900">
                                            {selectedCall.response_data.todays_agenda}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Call Summary */}
                            {selectedCall.response_data?.call_summary && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Call Summary</h3>
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-900">
                                            {selectedCall.response_data.call_summary}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Call Transcript */}
                            {selectedCall.response_data?.call_transcript && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Full Transcript
                                    </h3>
                                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                        <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                                            {selectedCall.response_data.call_transcript}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Recording URL */}
                            {selectedCall.recording_url && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Recording</h3>
                                    <audio controls className="w-full">
                                        <source src={selectedCall.recording_url} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
