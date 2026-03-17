import { PropsWithChildren } from "react";
import { SectionTitle } from "@ui/components";

export default function SellerLayout({ children }: PropsWithChildren) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Кабинет продавца" />
      {children}
    </div>
  );
}
