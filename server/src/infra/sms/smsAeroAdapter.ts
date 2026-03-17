import config from "../../shared/config";

const ENDPOINT = "https://gate.smsaero.ru/v21/sms/send";

function toProviderNumber(e164: string): string {
  // SMS Aero хочет цифры без '+'
  return e164.replace(/[^\d]/g, "");
}

export async function sendSms({
  to,
  text,
}: {
  to: string;
  text: string;
}): Promise<void> {
  const email = (config.smsaero.email || "").trim();
  const apiKey = (config.smsaero.apiKey || "").trim();
  const sign = config.smsaero.sign || "SMS Aero";
  const channel = config.smsaero.channel;

  // Всегда логируем в dev, чтобы видеть код
  if (config.nodeEnv !== "production") {
    console.log(`[DEV SMS] -> ${to}: ${text}`);
  }

  // Локально можно работать и без реальной отправки
  if (!email || !apiKey) return;

  const number = toProviderNumber(to);

  const qs = new URLSearchParams();
  qs.set("number", number);
  qs.set("text", text);
  qs.set("sign", sign);
  if (channel) qs.set("channel", channel);

  // Авторизация по Basic: base64(email:apiKey), как аналог 'email:api_key@host'
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

  let resp: Response;
  try {
    resp = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      method: "GET", // дока допускает запрос с query-параметрами
      headers: {
        accept: "application/json",
        authorization: `Basic ${auth}`,
      },
    });
  } catch (e) {
    if (config.nodeEnv !== "production") {
      console.warn(
        "[SmsAero] network error, DEV fallback used:",
        (e as Error)?.message
      );
      return;
    }
    throw e;
  }

  const bodyText = await resp.text().catch(() => "");
  let data: any = null;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    /* ignore non-JSON */
  }

  // В dev не валим поток даже при 401/ошибке шлюза — чтобы OTP флоу работал
  if (!resp.ok || (data && data.success === false)) {
    const msg = data?.message || bodyText || `HTTP ${resp.status}`;
    if (config.nodeEnv !== "production") {
      console.warn(`[SmsAero] Error: ${msg} (DEV fallback used)`);
      return;
    }
    throw new Error(`SmsAero error: ${msg}`);
  }
}
export default sendSms;
