"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useMe } from "@/lib/queries/me";
import type { UserMe } from "@/lib/api/users";

export type SessionStatus = "loading" | "anon" | "authed";

type SessionContextValue = {
  status: SessionStatus;
  me: UserMe | null;
  refetchMe: ReturnType<typeof useMe>["refetch"];
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const meQuery = useMe();

  const status: SessionStatus = useMemo(() => {
    if (meQuery.isLoading) return "loading";
    if (meQuery.data) return "authed";
    return "anon";
  }, [meQuery.isLoading, meQuery.data]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      me: meQuery.data ?? null,
      refetchMe: meQuery.refetch,
    }),
    [meQuery.data, meQuery.refetch, status],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession must be used within <SessionProvider />");
  return ctx;
}
