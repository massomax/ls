"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type SearchContextValue = {
  query: string;
  setQuery: (v: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: PropsWithChildren) {
  const [query, setQuery] = useState<string>("");

  const value = useMemo<SearchContextValue>(
    () => ({ query, setQuery }),
    [query],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider />");
  return ctx;
}
