import { Button, Card, CardBody } from "@ui/components";

type Props = {
  title?: string;
  hint?: string;
  actionText?: string;
  onAction?: () => void;
};

export default function PageStateEmpty({
  title = "Ничего не найдено",
  hint = "Попробуйте изменить фильтры или запрос.",
  actionText = "Сбросить",
  onAction,
}: Props) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="text-base font-semibold text-lp-text">{title}</div>
        <div className="text-sm text-lp-muted">{hint}</div>
        {onAction ? (
          <div className="pt-1">
            <Button onClick={onAction}>{actionText}</Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
