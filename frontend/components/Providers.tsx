"use client";

import { SessionProvider } from "next-auth/react";
import CapacitorInit from "@/components/CapacitorInit";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CapacitorInit />
      {children}
    </SessionProvider>
  );
}
