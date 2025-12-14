"use client";

import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/context/AuthContext";
import FABMobile from "@/components/ui/FABMobile";
import { ReactQueryProvider } from "@/lib/react-query/provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UserStatusSyncProvider } from "@/components/status/UserStatusSyncProvider";
import dynamic from "next/dynamic";
import { LazyMotion, domAnimation } from "framer-motion";

const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  {
    ssr: false,
  }
);

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <ThemeProvider>
          <AuthProvider session={session}>
            <UserStatusSyncProvider autoDetectMatch={true}>
              <LazyMotion features={domAnimation}>
                {children}
                <Toaster />
                {/* Botón flotante global solo móvil */}
                {/* <FABMobile /> */}
              </LazyMotion>
            </UserStatusSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}
