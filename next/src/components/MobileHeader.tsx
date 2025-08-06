"use client";

import { usePathname } from "next/navigation";

export default function MobileHeader() {
    const pathname = usePathname();
    
    // Determine page title based on pathname
    const getPageTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/dashboard/patients" || pathname.startsWith("/dashboard/patients/")) return "Patients";
        if (pathname === "/dashboard/calls") return "Call History";
        return "Dashboard";
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-30 md:hidden flex items-center px-4">
            <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>
    );
}