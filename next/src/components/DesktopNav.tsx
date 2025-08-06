"use client";

import Link from "next/link";
import { Home, Users, Phone } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DesktopNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard/patients", label: "Patients", icon: Users },
        { href: "/dashboard/calls", label: "Call History", icon: Phone },
    ];

    return (
        <nav className="mt-6">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${
                            isActive ? "bg-gray-100 text-gray-900 border-l-4 border-blue-600" : ""
                        }`}
                    >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}