import { redirect } from "next/navigation";
import { logoutUser, getUser } from "@/dal/auth";
import LogoutButton from "@/components/LogoutButton";
import MobileNavWrapper from "@/components/MobileNavWrapper";
import MobileHeader from "@/components/MobileHeader";
import DesktopNav from "@/components/DesktopNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getUser();

    if (!user) {
        redirect("/auth");
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile Navigation */}
            <MobileNavWrapper userEmail={user.email!} logoutAction={logoutUser} />
            
            {/* Mobile Header - only visible on mobile */}
            <MobileHeader />

            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-800">Aviator Agents</h1>
                    <p className="text-gray-600 mt-2 text-s italic">
                        Personalized care for the ones you love the most.
                    </p>
                </div>

                <DesktopNav />

                <div className="absolute bottom-0 w-64 p-6">
                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 text-center mb-3">{user.email}</p>
                        <LogoutButton onClick={logoutUser} />
                    </div>
                </div>
            </div>

            {/* Main content - full width on mobile, with padding for header */}
            <div className="flex-1 overflow-auto pt-16 md:pt-0">{children}</div>
        </div>
    );
}
