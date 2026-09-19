"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

/** Client-side providers: honour the OS "reduce motion" setting everywhere, and toast notifications. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="bottom-center"
        offset={24}
        mobileOffset={{ bottom: 88 }} // clear the mobile tab bar
        theme="system"
        closeButton={false}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-border !bg-card !text-foreground !shadow-[var(--shadow)] !font-sans !text-sm",
            description: "!text-muted",
          },
        }}
      />
    </MotionConfig>
  );
}
