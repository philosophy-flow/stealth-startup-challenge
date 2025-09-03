import Link from "next/link";
import { Plus, User } from "lucide-react";
import { getPatients } from "@/lib/supabase/patients";
import PatientTable from "@/components/PatientTable";
import PatientCards from "@/components/PatientCards";

export default async function PatientsPage() {
    const patients = await getPatients();

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="hidden sm:block text-2xl sm:text-3xl font-bold text-gray-900">Patients</h1>
                    <p className="text-gray-600 sm:mt-2 text-sm sm:text-base">Manage patient profile details.</p>
                </div>

                <Link
                    href="/dashboard/patients/new"
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Patient
                </Link>
            </div>

            {!patients || patients.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No patients yet</h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-6">Get started by adding your first patient</p>
                    <Link
                        href="/dashboard/patients/new"
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add your first patient
                    </Link>
                </div>
            ) : (
                <>
                    {/* Mobile cards view */}
                    <PatientCards patients={patients} />

                    {/* Desktop table view */}
                    <div className="hidden lg:block">
                        <PatientTable patients={patients} />
                    </div>
                </>
            )}
        </div>
    );
}
