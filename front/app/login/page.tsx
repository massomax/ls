"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next");
    let safeNext = next && next.startsWith("/") ? next : "/";
    if (safeNext.startsWith("/login")) safeNext = "/";

    const url = new URL(safeNext, window.location.origin);
    url.searchParams.set("login", "1");
    if (next && next.startsWith("/")) {
      url.searchParams.set("next", next);
    }

    router.replace(url.pathname + url.search + url.hash);
  }, [router, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageStateSkeleton rows={4} />}>
      <LoginRedirect />
    </Suspense>
  );
}
