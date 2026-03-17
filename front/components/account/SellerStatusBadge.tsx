import { Badge } from "@ui/components";

type SellerStatus = "pending" | "active" | "rejected" | "suspended";

const STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонено",
  suspended: "Приостановлено",
};

const STATUS_CLASSES: Record<SellerStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  suspended: "border-slate-200 bg-slate-50 text-slate-600",
};

type Props = {
  status: SellerStatus;
};

export default function SellerStatusBadge({ status }: Props) {
  return (
    <Badge className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
