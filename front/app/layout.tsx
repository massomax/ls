import "./globals.css";
import AppShell from "../components/shell/AppShell";
import AppProviders from "../components/providers/AppProviders";
import { SessionProvider } from "../components/providers/session";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>
          <SessionProvider>
            <Suspense fallback={null}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </SessionProvider>
        </AppProviders>
      </body>
    </html>
  );
}
