"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Hauptkomponenten
const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    data-slot="avatar"
    className={`inline-block overflow-hidden rounded-full ${className}`}
    {...props}
  />
);

const AvatarImage = ({ className, src, alt, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image
    data-slot="avatar-image"
    className={`h-full w-full object-cover rounded-full ${className}`}
    src={src}
    alt={alt}
    onError={(e) => console.error(`Fehler beim Laden des Avatarbilds: ${src}`, e)}
    {...props}
  />
);

const AvatarFallback = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    data-slot="avatar-fallback"
    className={`flex h-full w-full items-center justify-center bg-gray-200 text-gray-500 rounded-full ${className}`}
    {...props}
  />
);

// Hook: Profilbild abrufen + bei Änderungen aktualisieren
export const useProfilePicture = () => {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      const snap = await getDoc(userDocRef);
      const data = snap.data();
      setUrl(data?.step3?.profilePictureURL || null);
    };

    load();

    // ⏱ Reagiert auf 'window.dispatchEvent(new Event("profilePictureUpdated"))'
    window.addEventListener("profilePictureUpdated", load);
    return () => window.removeEventListener("profilePictureUpdated", load);
  }, []);

  return url;
};

export { Avatar, AvatarImage, AvatarFallback };



