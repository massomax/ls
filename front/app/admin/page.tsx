import { Card, CardBody, SectionTitle } from "@ui/components";

export default function AdminHomePage() {
  return (
    <div className="space-y-3">
      <SectionTitle title="Admin home" hint="Overview" />
      <Card>
        <CardBody className="text-sm text-lp-muted">
          TODO: connect API in C1/C2/...
        </CardBody>
      </Card>
    </div>
  );
}
