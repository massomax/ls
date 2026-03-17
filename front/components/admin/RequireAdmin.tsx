"use client";

import { PropsWithChildren, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

export default function RequireAdmin({ children }: PropsWithChildren) {
  const router = useRouter();
  const { status, me } = useSession();

  const isAdmin = useMemo(
    () => me?.roles?.some((role) => role === "admin") ?? false,
    [me?.roles],
  );

  useEffect(() => {
    if (status === "anon") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return <PageStateSkeleton rows={4} />;
  }

  if (status === "anon") {
    return <PageStateSkeleton rows={4} />;
  }

  if (!isAdmin) {
    return (
      <PageStateEmpty
        title="Доступ запрещен"
        hint="Административный раздел доступен только администраторам."
      />
    );
  }

  return <>{children}</>;
}
