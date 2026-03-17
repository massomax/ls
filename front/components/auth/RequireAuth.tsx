"use client";

import { type PropsWithChildren } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { useSession } from "@/components/providers/session";

type RequireAuthProps = PropsWithChildren<{
  title?: string;
  hint?: string;
  skeletonRows?: number;
  actionText?: string;
}>;

export default function RequireAuth({
  children,
  title,
  hint,
  skeletonRows = 4,
  actionText = "Войти",
}: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { status, me } = useSession();

  if (status === "loading") {
    return <PageStateSkeleton rows={skeletonRows} />;
  }

  if (status !== "authed" || !me) {
    const qs = sp.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    return (
      <div className="space-y-4">
        {title ? <SectionTitle title={title} hint={hint} /> : null}
        <PageStateEmpty
          title="Вы не вошли"
          hint={hint ?? "Авторизуйтесь по SMS, чтобы продолжить."}
          actionText={actionText}
          onAction={() =>
            router.push(`/login?next=${encodeURIComponent(next)}`)
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
