import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import sendSms from "../../infra/sms/smsAeroAdapter";
import config from "../../shared/config";
import {
  BadRequestError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import logger from "../../shared/logger";
import { normalizeE164 } from "../../shared/utils/phone";
import { issueAccess, issueRefresh, setRefreshCookie } from "./tokenService";
import { issueCode, verifyCode } from "./otpService";
import User from "../users/userModel";

const router = Router();

router.get("/ping", (_req, res) => res.json({ ok: true, where: "auth" }));

const phoneSchema = z.object({ phone: z.string().min(5).max(32) });
const verifySchema = z.object({
  phone: z.string().min(5).max(32),
  code: z.string().min(4).max(8),
});

router.post("/login-sms/request", async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid phone");

  const e164 = normalizeE164(parsed.data.phone);
  if (!e164) throw new BadRequestError("Invalid phone");

  let user = await User.findOne({ phone: e164 });
  if (!user) {
    user = await User.create({
      phone: e164,
      roles: ["user"],
      isPhoneVerified: false,
    });
  }

  const { code } = await issueCode(e164);

  logger.info(
    {
      phone: e164,
      code,
      channel: "login-sms",
    },
    "OTP code issued",
  );

  try {
    await sendSms({
      to: e164,
      text: `Kod dlya vhoda: ${code}. Nikomu ego ne soobschayte.`,
    });
  } catch (err) {
    logger.error(
      {
        phone: e164,
        code,
        err,
      },
      "SMS send failed, OTP remains active",
    );
  }

  res.sendStatus(204);
});

router.post("/login-sms/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid input");

  const e164 = normalizeE164(parsed.data.phone);
  if (!e164) throw new BadRequestError("Invalid phone");

  const ok = await verifyCode(e164, parsed.data.code);
  if (!ok) throw new BadRequestError("InvalidOrExpiredCode");

  const user = await User.findOneAndUpdate(
    { phone: e164 },
    { $set: { isPhoneVerified: true } },
    { new: true },
  );
  if (!user) throw new UnauthorizedError("UserNotFound");

  const accessToken = issueAccess({ sub: String(user._id), roles: user.roles });
  const refreshToken = issueRefresh({
    sub: String(user._id),
    roles: user.roles,
  });
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, roles: user.roles });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new UnauthorizedError("MissingRefresh");

  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret) as {
      sub: string;
      roles?: string[];
      typ?: string;
    };

    if (payload.typ !== "refresh") {
      throw new UnauthorizedError("InvalidRefresh");
    }

    const accessToken = issueAccess({ sub: payload.sub, roles: payload.roles });
    const refreshToken = issueRefresh({
      sub: payload.sub,
      roles: payload.roles,
    });
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken });
  } catch {
    throw new UnauthorizedError("InvalidRefresh");
  }
});

router.post("/logout", async (_req, res) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.sendStatus(204);
});

export default router;
