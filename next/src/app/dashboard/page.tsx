import Link from "next/link";
import { Users, Phone, Calendar, Smile } from "lucide-react";

import { getPatients, getCalls, getTodaysCalls, getMoodStats } from "@/dal/patients";

export default async function DashboardPage() {
    const patients = await getPatients();
    const calls = await getCalls();
    const todaysCalls = await getTodaysCalls();
    const moodStats = await getMoodStats();

    const patientsCount = patients ? patients.length : 0;
    const callsCount = calls ? calls.length : 0;
    const todaysCallsCount = todaysCalls ? todaysCalls.length : 0;
    const moodRate = moodStats.total > 0 
        ? Math.round((moodStats.positive / moodStats.total) * 100)
        : 0;

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-6 sm:mb-8">
                <h1 className="hidden sm:block text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600 sm:mt-2 max-w-xl">
                    Use your AI care companion to make daily check-in calls to elderly patients.
                </p>
                <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl">
                    Each call includes personalized greetings (with 6 voice options), mood checks, medication reminders,
                    and cognitive games.
                </p>
                <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl">
                    Add patients to begin, then trigger calls from the Patients page.
                </p>
                <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl">
                    View detailed logs from the Call History page that include a full transcript and summary of the
                    conversation.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Patients</p>
                            <p className="text-2xl font-semibold text-gray-900">{patientsCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Phone className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Calls</p>
                            <p className="text-2xl font-semibold text-gray-900">{callsCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Today&apos;s Calls</p>
                            <p className="text-2xl font-semibold text-gray-900">{todaysCallsCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Smile className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Happiness Rate</p>
                            <p className="text-2xl font-semibold text-gray-900">{moodStats.total > 0 ? `${moodRate}%` : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        href="/dashboard/patients/new"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                    >
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Add New Patient</p>
                    </Link>

                    <Link
                        href="/dashboard/patients"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
                    >
                        <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Trigger Call</p>
                    </Link>

                    <Link
                        href="/dashboard/calls"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center"
                    >
                        <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">View Call History</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
