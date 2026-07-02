"use client";

import { RouteErrorPage } from "@/components/RouteErrorPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorPage
      title="Explorer Error"
      fallbackMessage="Something went wrong loading this page."
      error={error}
      reset={reset}
    />
  );
}
