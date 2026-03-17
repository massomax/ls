import Link from "next/link";
import { PropsWithChildren } from "react";
import { Card, CardBody, SectionTitle } from "@ui/components";
import RequireAdmin from "@/components/admin/RequireAdmin";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    href: "/admin/sellers",
    label: "Sellers",
    description: "Manage seller accounts and approvals.",
  },
  {
    href: "/admin/products",
    label: "Products",
    description: "Review catalog items and moderation queues.",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    description: "Edit category taxonomy and ordering.",
  },
  {
    href: "/admin/subcategories/pending",
    label: "Pending subcategories",
    description: "Approve or decline new subcategory requests.",
  },
  {
    href: "/admin/subcategories/new",
    label: "Create subcategory",
    description: "Add a subcategory under an existing category.",
  },
  {
    href: "/admin/offer-types",
    label: "Offer types",
    description: "Control offer badges and pricing types.",
  },
];

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <RequireAdmin>
      <div className="space-y-4">
        <SectionTitle title="Admin" hint="Internal console" />
        <Card>
          <CardBody className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
              Navigation
            </div>
            <nav className="grid gap-3 md:grid-cols-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-lp-border bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-lp-text">
                    {item.label}
                  </div>
                  <div className="text-xs text-lp-muted">
                    {item.description}
                  </div>
                </Link>
              ))}
            </nav>
          </CardBody>
        </Card>
        {children}
      </div>
    </RequireAdmin>
  );
}
