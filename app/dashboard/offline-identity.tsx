"use client";

import { useEffect } from "react";
import { setActiveOfflineUser } from "@/lib/offline";

type OfflineIdentityProps = {
  user: { id: string; email: string | null; name: string | null; username: string | null };
};

export default function OfflineIdentity({ user }: OfflineIdentityProps) {
  useEffect(() => {
    void setActiveOfflineUser(user).catch(() => undefined);
  }, [user]);
  return null;
}
