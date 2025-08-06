import type { LogoutButtonProps } from "@/types/components";
import { LogOut } from "lucide-react";

export default function LogoutButton({ onClick }: LogoutButtonProps) {
    return (
        <button
            type="submit"
            className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors w-full justify-center"
            onClick={onClick}
        >
            <LogOut className="w-5 h-5 mr-2" />
            Sign out
        </button>
    );
}
