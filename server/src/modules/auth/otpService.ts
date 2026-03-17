import bcrypt from "bcrypt";
import OtpCode from "./otpModel";
import config from "../../shared/config";
import { TooManyRequestsError } from "../../shared/errors/httpErrors";
import { normalizeE164 } from "../../shared/utils/phone";

function randomCode(len = 6): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join(
    ""
  );
}

export async function issueCode(
  rawPhone: string
): Promise<{ phone: string; code: string }> {
  const phone = normalizeE164(rawPhone);
  if (!phone) throw new Error("Invalid phone");

  const last = await OtpCode.findOne({ phone, purpose: "login" }).sort({
    createdAt: -1,
  });
  const now = Date.now();
  if (
    last?.lastSentAt &&
    now - last.lastSentAt.getTime() < config.otp.resendSec * 1000
  ) {
    const left = Math.ceil(
      (config.otp.resendSec * 1000 - (now - last.lastSentAt.getTime())) / 1000
    );
    throw new TooManyRequestsError(`Resend after ${left}s`);
  }

  const code = randomCode(6);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now + config.otp.ttlSec * 1000);

  await OtpCode.create({
    phone,
    purpose: "login",
    codeHash,
    expiresAt,
    lastSentAt: new Date(),
    sentCount: (last?.sentCount ?? 0) + 1,
  });

  return { phone, code };
}

export async function verifyCode(
  rawPhone: string,
  code: string
): Promise<boolean> {
  const phone = normalizeE164(rawPhone);
  if (!phone) return false;

  const rec = await OtpCode.findOne({
    phone,
    purpose: "login",
    consumed: false,
  }).sort({ createdAt: -1 });
  if (!rec) return false;
  if (rec.expiresAt.getTime() < Date.now()) return false;
  if (rec.attempts >= config.otp.maxAttempts) return false;

  const ok = await bcrypt.compare(code, rec.codeHash);
  rec.attempts += 1;
  if (ok) rec.consumed = true;
  await rec.save();

  return ok;
}
