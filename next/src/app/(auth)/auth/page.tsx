"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
        });

        if (error) {
            setMessage({ type: "error", text: error.message });
            setLoading(false);
        } else {
            setMessage({ type: "success", text: "Check your email for the verification code!" });
            setCodeSent(true);
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: "email",
        });

        if (error) {
            setMessage({ type: "error", text: error.message });
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        setMessage(null);
        setCode("");

        const { error } = await supabase.auth.signInWithOtp({
            email,
        });

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "New code sent! Check your email." });
        }

        setLoading(false);
    };

    const handleChangeEmail = () => {
        setCodeSent(false);
        setCode("");
        setMessage(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Get Started</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {!codeSent
                            ? "Enter your email to receive a verification code"
                            : "Enter the 6-digit code sent to your email"}
                    </p>
                </div>

                {!codeSent ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSendCode}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your email"
                            />
                        </div>

                        {message && (
                            <div
                                className={`rounded-md p-4 ${
                                    message.type === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                                }`}
                            >
                                <p className="text-sm">{message.text}</p>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Sending..." : "Send verification code"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                Verification code
                            </label>
                            <input
                                id="code"
                                name="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                                placeholder="000000"
                            />
                        </div>

                        <div className="text-sm text-gray-600 text-center">
                            Code sent to: <span className="font-medium">{email}</span>
                            <button
                                type="button"
                                onClick={handleChangeEmail}
                                className="ml-2 text-blue-600 hover:text-blue-500 underline"
                            >
                                Change
                            </button>
                        </div>

                        {message && (
                            <div
                                className={`rounded-md p-4 ${
                                    message.type === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                                }`}
                            >
                                <p className="text-sm">{message.text}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Verifying..." : "Verify code"}
                            </button>

                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Resend code
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
