import Link from "next/link";
import { Plus, User } from "lucide-react";
import { getPatients } from "@/dal/patients";
import PatientTable from "@/components/PatientTable";

export default async function PatientsPage() {
    const patients = await getPatients();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
                    <p className="text-gray-600 mt-2">Manage your elderly patients</p>
                </div>

                <Link
                    href="/dashboard/patients/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Patient
                </Link>
            </div>

            {!patients || patients.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No patients yet</h2>
                    <p className="text-gray-600 mb-6">Get started by adding your first patient</p>
                    <Link
                        href="/dashboard/patients/new"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add your first patient
                    </Link>
                </div>
            ) : (
                <PatientTable patients={patients} />
            )}
        </div>
    );
}
