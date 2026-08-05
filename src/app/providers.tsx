"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { ThemeProvider, DynamicThemeColor } from "@/app/context/theme-context";
import { LanguageProvider } from "@/app/context/language-context";
import { SandboxProvider } from "@/app/context/sandbox-provider";
import { WalletProvider } from "@/app/context/wallet-context";
import { MotionConfig } from "framer-motion";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DynamicThemeColor />
        <LanguageProvider>
          <SandboxProvider>
            <WalletProvider>
              <MotionConfig reducedMotion="user">
                {children}
              </MotionConfig>
            </WalletProvider>
          </SandboxProvider>
        </LanguageProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
