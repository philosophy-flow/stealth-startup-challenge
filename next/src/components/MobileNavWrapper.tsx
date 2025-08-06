"use client";

import MobileNav from "./MobileNav";
import LogoutButton from "./LogoutButton";

interface MobileNavWrapperProps {
    userEmail: string;
    logoutAction: () => Promise<void>;
}

export default function MobileNavWrapper({ userEmail, logoutAction }: MobileNavWrapperProps) {
    return (
        <MobileNav 
            userEmail={userEmail} 
            logoutButton={<LogoutButton onClick={logoutAction} />}
        />
    );
}