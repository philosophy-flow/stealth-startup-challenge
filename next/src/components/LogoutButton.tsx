import type { LogoutButtonProps } from "@/types/components";
import { LogOut } from "lucide-react";

export default function LogoutButton({ onClick }: LogoutButtonProps) {
    return (
        <button type="submit" className="flex items-center text-gray-700 hover:text-gray-900" onClick={onClick}>
            <LogOut className="w-5 h-5 mr-2" />
            Sign out
        </button>
    );
}
