import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, Users, Phone } from "lucide-react";
import { logoutUser, getUser } from "@/dal/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getUser();

    if (!user) {
        redirect("/auth");
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-800">Aviator Agents</h1>
                    <p className="text-gray-600 mt-2 text-s italic">
                        Personalized care for the ones you love the most.
                    </p>
                </div>

                <nav className="mt-6">
                    <Link
                        href="/dashboard"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                        <Home className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>

                    <Link
                        href="/dashboard/patients"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                        <Users className="w-5 h-5 mr-3" />
                        Patients
                    </Link>

                    <Link
                        href="/dashboard/calls"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                        <Phone className="w-5 h-5 mr-3" />
                        Call History
                    </Link>
                </nav>

                <div className="absolute bottom-0 w-64 p-6">
                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 text-center mb-3">{user.email}</p>
                        <LogoutButton onClick={logoutUser} />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto">{children}</div>
        </div>
    );
}
