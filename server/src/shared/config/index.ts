import "dotenv/config";
import { z } from "zod";

const csv = (value: string | undefined, fallback: string[] = []) =>
  (value &&
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) ||
  fallback;

const durationToSeconds = (input: string): number => {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const match = trimmed.match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) {
    return 900;
  }

  const [, amount, unit] = match;
  const multiplier: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86_400,
    w: 604_800,
  };

  return parseInt(amount, 10) * multiplier[unit.toLowerCase()];
};

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),

  MONGO_URI: z.string().default("mongodb://127.0.0.1:27017/lastpiece"),

  JWT_ACCESS_SECRET: z.string().default("dev_access_secret"),
  JWT_ACCESS_EXPIRES: z.string().default("15m").transform(durationToSeconds),
  JWT_REFRESH_SECRET: z.string().default("dev_refresh_secret"),
  JWT_REFRESH_EXPIRES: z.string().default("7d").transform(durationToSeconds),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  CORS_ORIGINS: z.string().optional(),

  SMSAERO_EMAIL: z.string().default(""),
  SMSAERO_API_KEY: z.string().default(""),
  SMSAERO_SIGN: z.string().default("SMS Aero"),
  SMSAERO_CHANNEL: z.string().default("DIRECT"),
  NOTIFY_SMS_ENABLED: z.string().default("true"),
  NOTIFY_SMS_SELLER_EVENTS: z.string().default("true"),

  OTP_TTL_SEC: z.coerce.number().default(300),
  OTP_RESEND_SEC: z.coerce.number().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  UPLOAD_MAX_FILES: z.coerce.number().default(10),
  UPLOAD_MAX_MB: z.coerce.number().default(5),
  UPLOAD_ALLOWED_MIME: z.string().optional(),
  IMGUR_CLIENT_ID: z.string().default(""),
});

const raw = envSchema.parse(process.env);

export const config = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,

  mongoUri: raw.MONGO_URI,

  jwt: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    accessExpires: raw.JWT_ACCESS_EXPIRES,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    refreshExpires: raw.JWT_REFRESH_EXPIRES,
  },

  cookies: {
    domain: raw.COOKIE_DOMAIN,
    secure: raw.COOKIE_SECURE,
  },

  cors: {
    origins: csv(raw.CORS_ORIGINS, [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://172.25.32.1:3000",
    ]),
  },

  smsaero: {
    email: raw.SMSAERO_EMAIL,
    apiKey: raw.SMSAERO_API_KEY,
    sign: raw.SMSAERO_SIGN,
    channel: raw.SMSAERO_CHANNEL,
  },
  notifications: {
    smsEnabled: raw.NOTIFY_SMS_ENABLED === "true",
    smsSellerEvents: raw.NOTIFY_SMS_SELLER_EVENTS === "true",
  },

  imgur: {
    clientId: raw.IMGUR_CLIENT_ID,
  },

  otp: {
    ttlSec: raw.OTP_TTL_SEC,
    resendSec: raw.OTP_RESEND_SEC,
    maxAttempts: raw.OTP_MAX_ATTEMPTS,
  },

  uploads: {
    maxFiles: raw.UPLOAD_MAX_FILES,
    maxMb: raw.UPLOAD_MAX_MB,
    allowedMime: csv(raw.UPLOAD_ALLOWED_MIME, [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
  },
} as const;

export default config;
