import config from "../../shared/config";
import logger from "../../shared/logger";

const ENDPOINT = "https://gate.smsaero.ru/v2/sms/send";

function toProviderNumber(e164: string): string {
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

  logger.info(
    {
      provider: "smsaero",
      to,
      text,
      sign,
      channel,
      nodeEnv: config.nodeEnv,
    },
    "Sending SMS",
  );

  if (!email || !apiKey) {
    logger.warn(
      { provider: "smsaero", to },
      "SMS credentials are missing, skipping real send",
    );
    return;
  }

  const number = toProviderNumber(to);
  const qs = new URLSearchParams();
  qs.set("number", number);
  qs.set("text", text);
  qs.set("sign", sign);
  qs.set("answer", "json");
  if (channel) qs.set("channel", channel);

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

  let resp: Response;
  try {
    resp = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${auth}`,
      },
    });
  } catch (e) {
    logger.error(
      {
        provider: "smsaero",
        to,
        err: e,
      },
      "SMS provider network error",
    );

    if (config.nodeEnv !== "production") {
      return;
    }

    throw e;
  }

  const bodyText = await resp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    data = bodyText;
  }

  logger.info(
    {
      provider: "smsaero",
      to,
      status: resp.status,
      ok: resp.ok,
      response: data,
    },
    "SMS provider response",
  );

  const success =
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success?: boolean }).success === true;

  if (!resp.ok || !success) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : bodyText || `HTTP ${resp.status}`;

    if (config.nodeEnv !== "production") {
      logger.warn(
        { provider: "smsaero", to, message: msg },
        "SMS send failed in non-production",
      );
      return;
    }

    throw new Error(`SmsAero error: ${msg}`);
  }
}

export default sendSms;
