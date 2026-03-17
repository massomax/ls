import { useCallback, useMemo, useState } from "react";
import type { Cursor } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

type UseCursorParamsOptions = {
  limit?: number;
  filterDeps?: ReadonlyArray<unknown>;
  filterKey?: string;
};

export function useCursorParams(options: UseCursorParamsOptions = {}) {
  const { limit = DEFAULT_LIMIT, filterDeps = [], filterKey } = options;
  const resolvedKey = useMemo(
    () => filterKey ?? JSON.stringify(filterDeps),
    [filterKey, filterDeps],
  );
  const [state, setState] = useState<{ cursor: Cursor; filterKey: string }>(
    () => ({
      cursor: null,
      filterKey: resolvedKey,
    }),
  );

  const cursor = state.filterKey === resolvedKey ? state.cursor : null;

  const setCursor = useCallback(
    (next: Cursor) => {
      setState({ cursor: next, filterKey: resolvedKey });
    },
    [resolvedKey],
  );

  const resetCursor = useCallback(() => {
    setState({ cursor: null, filterKey: resolvedKey });
  }, [resolvedKey]);

  return {
    limit,
    cursor,
    setCursor,
    resetCursor,
  };
}
