import { useMemo, useState } from "react";
import { Button, Card, CardBody, Input } from "@ui/components";
import type { SellerApplyInput } from "@/lib/api/sellers";

type FieldErrors = {
  companyName?: string;
  inn?: string;
  contactEmail?: string;
};

type Props = {
  initial?: Partial<SellerApplyInput>;
  onSubmit: (input: SellerApplyInput) => Promise<void>;
  isSubmitting: boolean;
  errorText?: string | null;
  onCancel?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function validate(values: SellerApplyInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.companyName.trim()) {
    errors.companyName = "Укажите название компании.";
  }
  const innDigits = digitsOnly(values.inn);
  if (!innDigits) {
    errors.inn = "Укажите ИНН.";
  } else if (innDigits.length < 10 || innDigits.length > 12) {
    errors.inn = "ИНН должен содержать 10-12 цифр.";
  } else if (innDigits !== values.inn) {
    errors.inn = "ИНН должен содержать только цифры.";
  }
  if (values.contactEmail && !EMAIL_RE.test(values.contactEmail)) {
    errors.contactEmail = "Проверьте email.";
  }
  return errors;
}

export default function SellerApplyForm({
  initial,
  onSubmit,
  isSubmitting,
  errorText,
  onCancel,
}: Props) {
  const [companyName, setCompanyName] = useState(
    () => initial?.companyName ?? "",
  );
  const [inn, setInn] = useState(() => initial?.inn ?? "");
  const [contactEmail, setContactEmail] = useState(
    () => initial?.contactEmail ?? "",
  );
  const [contactName, setContactName] = useState(
    () => initial?.contactName ?? "",
  );
  const [website, setWebsite] = useState(() => initial?.website ?? "");
  const [legalAddress, setLegalAddress] = useState(
    () => initial?.legalAddress ?? "",
  );
  const [ogrn, setOgrn] = useState(() => initial?.ogrn ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const payload = useMemo<SellerApplyInput>(
    () => ({
      companyName: companyName.trim(),
      inn: inn.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactName: contactName.trim() || undefined,
      website: website.trim() || undefined,
      legalAddress: legalAddress.trim() || undefined,
      ogrn: ogrn.trim() || undefined,
    }),
    [
      companyName,
      inn,
      contactEmail,
      contactName,
      website,
      legalAddress,
      ogrn,
    ],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(payload);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    await onSubmit(payload);
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="space-y-1">
          <div className="text-base font-semibold text-lp-text">
            Заявка на продавца
          </div>
          <div className="text-xs text-lp-muted">
            Заполните данные компании и контактного лица.
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-lp-text">
              Название компании
            </label>
            <Input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="ООО Пример"
              disabled={isSubmitting}
            />
            {errors.companyName ? (
              <div className="text-xs text-lp-danger">{errors.companyName}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lp-text">ИНН</label>
            <Input
              value={inn}
              onChange={(event) => setInn(event.target.value)}
              placeholder="10-12 цифр"
              inputMode="numeric"
              disabled={isSubmitting}
            />
            {errors.inn ? (
              <div className="text-xs text-lp-danger">{errors.inn}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lp-text">
              Email (опционально)
            </label>
            <Input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="name@company.ru"
              type="email"
              disabled={isSubmitting}
            />
            {errors.contactEmail ? (
              <div className="text-xs text-lp-danger">{errors.contactEmail}</div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-lp-text">
                Контактное лицо
              </label>
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Имя и фамилия"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-lp-text">Сайт</label>
              <Input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://"
                type="url"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lp-text">
              Юридический адрес
            </label>
            <Input
              value={legalAddress}
              onChange={(event) => setLegalAddress(event.target.value)}
              placeholder="Город, улица, дом"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-lp-text">ОГРН</label>
            <Input
              value={ogrn}
              onChange={(event) => setOgrn(event.target.value)}
              placeholder="Опционально"
              inputMode="numeric"
              disabled={isSubmitting}
            />
          </div>

          {errorText ? (
            <div className="text-sm text-lp-danger">{errorText}</div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Отправляем…" : "Отправить заявку"}
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
