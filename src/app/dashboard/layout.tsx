'use client';

export const dynamic = "force-dynamic";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Header from "@/components/Header";
import { Suspense } from "react";
import { FiLoader } from "react-icons/fi";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                <div className="flex flex-col">
                    <Header />
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><FiLoader className="h-8 w-8 animate-spin text-teal-500" /></div>}>
                        <main className="flex-1 p-4 sm:p-6">{children}</main>
                    </Suspense>
                </div>
            </div>
        </ProtectedRoute>
    );
}