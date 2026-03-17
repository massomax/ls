import { Button, Card, CardBody } from "@ui/components";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export default function PageStateError({
  title = "Ошибка загрузки",
  message = "Не удалось получить данные. Проверьте соединение и повторите.",
  onRetry,
}: Props) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="text-base font-semibold text-lp-text">{title}</div>
        <div className="text-sm text-lp-muted">{message}</div>
        {onRetry ? (
          <div className="pt-1">
            <Button onClick={onRetry}>Повторить</Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
