"use client";

import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const isDevelopment = process.env.NODE_ENV === "development";

    return isDevelopment ? (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Development Error</h1>
                <p className="font-mono mb-4">{error.message}</p>
                {error.stack && <pre className="text-xs bg-black p-4 rounded overflow-auto">{error.stack}</pre>}
                <button onClick={reset} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Reset
                </button>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
                <p className="text-gray-600 mb-8">We apologize for the inconvenience.</p>
                <div className="space-y-4">
                    <button onClick={reset} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Try Again
                    </button>
                    <div>
                        <Link href="/" className="text-blue-600 hover:underline">
                            Go to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
