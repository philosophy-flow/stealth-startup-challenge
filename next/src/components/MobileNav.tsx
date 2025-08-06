"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Users, Phone, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
interface MobileNavProps {
    userEmail: string;
    logoutButton: React.ReactNode;
}

export default function MobileNav({ userEmail, logoutButton }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard/patients", label: "Patients", icon: Users },
        { href: "/dashboard/calls", label: "Call History", icon: Phone },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Hamburger/Close button - only visible on mobile */}
            <button
                onClick={toggleMenu}
                className="fixed top-4 right-4 z-50 p-2 md:hidden"
                aria-label="Toggle menu"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile sidebar */}
            <div
                className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800">Aviator Agents</h1>
                        <p className="text-gray-600 mt-2 text-sm italic">
                            Personalized care for the ones you love the most.
                        </p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 mt-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={toggleMenu}
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

                    {/* Footer with user info and logout */}
                    <div className="p-6 border-t">
                        <p className="text-sm text-gray-600 text-center mb-3">{userEmail}</p>
                        {logoutButton}
                    </div>
                </div>
            </div>
        </>
    );
}