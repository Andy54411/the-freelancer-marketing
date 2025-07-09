"use client";

import React from "react";
import NotificationBell from "./NotificationBell";
import { LogOut as FiLogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Header() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Fehler beim Abmelden: ", error);
    }
  };

  return (
    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
      <div className="w-full flex-1">
        {/* Platz für zukünftige Elemente wie eine Suchleiste */}
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleLogout}
          title="Abmelden"
        >
          <FiLogOut className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
    </header>
  );
}