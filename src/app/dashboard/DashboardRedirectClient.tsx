"use client";

import { useEffect } from "react";
import { redirect } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 as FiLoader } from "lucide-react";

export default function DashboardRedirectClient() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      switch (user.role) {
        case "master":
        case "support":
          redirect("/dashboard/admin");
          break;
        case "firma":
          redirect(`/dashboard/company/${user.uid}`);
          break;
        default:
          redirect(`/dashboard/user/${user.uid}`);
          break;
      }
    }
  }, [user, loading]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <FiLoader className="animate-spin text-3xl text-gray-400" />
    </div>
  );
}
