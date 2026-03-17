"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@ui/components";
import { isApiError } from "@/lib/api/apiError";
import { useLoginSmsRequest, useLoginSmsVerify } from "@/lib/queries/auth";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

const formatPhone = (digits: string) => {
  if (!digits) return "";
  const trimmed = digits.slice(0, 10);
  if (trimmed.length <= 3) return trimmed;
  if (trimmed.length <= 6) return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6)}`;
  }
  return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6, 8)} ${trimmed.slice(8)}`;
};

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");

  const requestSms = useLoginSmsRequest();
  const verifySms = useLoginSmsVerify();

  const normalizedPhone = useMemo(
    () => (phoneDigits ? `+7${phoneDigits}` : ""),
    [phoneDigits],
  );
  const formattedPhone = useMemo(() => formatPhone(phoneDigits), [phoneDigits]);

  const requestError = useMemo(() => {
    if (!requestSms.error) return null;
    return isApiError(requestSms.error)
      ? `${requestSms.error.code}: ${requestSms.error.message}`
      : "Не удалось отправить код.";
  }, [requestSms.error]);

  const verifyError = useMemo(() => {
    if (!verifySms.error) return null;
    return isApiError(verifySms.error)
      ? `${verifySms.error.code}: ${verifySms.error.message}`
      : "Не удалось подтвердить код.";
  }, [verifySms.error]);

  const onRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedPhone) return;

    try {
      await requestSms.mutateAsync({ phone: normalizedPhone });
      setStep("code");
    } catch {
      // Ошибка отображается через requestError
    }
  };

  const onVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (!normalizedPhone || !trimmedCode) return;

    try {
      await verifySms.mutateAsync({ phone: normalizedPhone, code: trimmedCode });
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/account";
      router.replace(safeNext);
    } catch {
      // Ошибка отображается через verifyError
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4 py-10">
      <div className="relative w-full max-w-md rounded-[32px] bg-white px-6 py-7 shadow-2xl sm:px-8 sm:py-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-lp-border text-lp-muted transition hover:bg-slate-50 hover:text-lp-text"
          aria-label="Закрыть"
        >
          X
        </button>

        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-lp-primary">
          Последняя Штучка
        </div>

        {step === "phone" ? (
          <form className="mt-4 space-y-5" onSubmit={onRequest}>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-lp-text">
                Введите номер телефона
              </h1>
              <p className="text-sm text-lp-muted">
                Мы отправим код или позвоним. Отвечать на звонок не нужно.
                Код может прийти в SMS или на почту.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-lp-text">
                Телефон
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-lp-border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-lp-primary focus-within:ring-offset-2">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1 text-sm font-semibold text-lp-text">
                  <span className="text-[10px] font-bold tracking-wide text-lp-muted">
                    RU
                  </span>
                  +7
                </div>
                <input
                  value={formattedPhone}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhoneDigits(digits);
                  }}
                  placeholder="999 999 99 99"
                  inputMode="numeric"
                  autoComplete="tel"
                  disabled={requestSms.isPending}
                  className="w-full bg-transparent px-1 py-2 text-sm text-lp-text outline-none"
                />
              </div>
              <div className="text-xs text-lp-muted">
                Мы отправим код для входа на указанный номер.
              </div>
            </div>

            {requestError ? (
              <div className="text-sm text-lp-danger">{requestError}</div>
            ) : null}

            <Button
              type="submit"
              className="w-full py-3 text-base"
              disabled={!normalizedPhone || requestSms.isPending}
            >
              {requestSms.isPending ? "Отправляем…" : "Войти"}
            </Button>

            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-lp-border" />
              <span className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
                или
              </span>
              <span className="h-px flex-1 bg-lp-border" />
            </div>

            <div className="space-y-2">
              <div className="text-center text-xs font-semibold uppercase tracking-wide text-lp-muted">
                Скоро
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full cursor-not-allowed justify-center gap-2 py-3 text-sm font-semibold opacity-60"
                disabled
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0077ff] text-[10px] font-bold text-white">
                  VK
                </span>
                Войти с VK ID
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full cursor-not-allowed justify-center gap-2 py-3 text-sm font-semibold opacity-60"
                disabled
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ff3b30]">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path
                      fill="white"
                      d="M12 3c-4.96 0-8.98 3.79-8.98 8.47 0 4.64 3.02 8.5 8.98 8.5 1.05 0 2.11-.17 3.16-.49v-6.12H12.5v-1.73h2.66V8.05c0-2.64 1.56-4.07 3.96-4.07.81 0 1.67.14 1.67.14v2.49h-.94c-.93 0-1.22.57-1.22 1.16v1.4h2.08l-.33 1.73h-1.75v7.13c2.19-1.45 3.44-3.9 3.44-7.06C21.98 6.79 16.96 3 12 3z"
                    />
                  </svg>
                </span>
                Вход через Yandex ID
              </Button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-5" onSubmit={onVerify}>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-lp-text">
                Введите код из SMS
              </h1>
              <p className="text-sm text-lp-muted">
                Отправили на номер {normalizedPhone || "—"}.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-lp-text">Код</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="0000"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={verifySms.isPending}
                className="w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2"
              />
            </div>

            {verifyError ? (
              <div className="text-sm text-lp-danger">{verifyError}</div>
            ) : null}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full py-3 text-base"
                disabled={!code.trim() || verifySms.isPending}
              >
                {verifySms.isPending ? "Проверяем…" : "Войти"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full py-3"
                onClick={() => setStep("phone")}
                disabled={verifySms.isPending}
              >
                Изменить номер
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
