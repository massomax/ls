import { Card, CardBody } from "@ui/components";

export default function PageStateSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardBody className="space-y-3">
            <div className="h-28 w-full animate-pulse rounded-2xl bg-lp-border/40" />
            <div className="h-4 w-3/4 animate-pulse rounded-xl bg-lp-border/40" />
            <div className="h-4 w-1/2 animate-pulse rounded-xl bg-lp-border/40" />
            <div className="h-8 w-full animate-pulse rounded-2xl bg-lp-border/40" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
