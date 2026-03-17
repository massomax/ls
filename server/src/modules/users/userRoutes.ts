import { Router } from "express";
import { z } from "zod";
import User from "./userModel";
import authenticateJwt from "../../shared/http/authenticateJwt";
import { BadRequestError } from "../../shared/errors/httpErrors";

const router = Router();

// все роуты ниже — только с JWT
router.use(authenticateJwt);

router.get("/me", async (req, res) => {
  const userId = req.user!.sub;
  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "NotFound" });

  const {
    _id,
    phone,
    isPhoneVerified,
    name,
    gender,
    birthDate,
    roles,
    createdAt,
  } = user;
  res.json({
    id: String(_id),
    phone,
    isPhoneVerified,
    name: name ?? null,
    gender: gender ?? null,
    birthDate: birthDate ? new Date(birthDate).toISOString() : null,
    roles,
    createdAt,
  });
});

const patchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthDate: z
    .string()
    .datetime({ offset: false })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)) // допускаем 'YYYY-MM-DD'
    .optional(),
});

router.patch("/me", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid input");

  const update: Record<string, any> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.gender !== undefined) update.gender = parsed.data.gender;
  if (parsed.data.birthDate !== undefined) {
    const d = new Date(parsed.data.birthDate);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestError("Invalid birthDate");
    update.birthDate = d;
  }

  const user = await User.findByIdAndUpdate(
    req.user!.sub,
    { $set: update },
    { new: true }
  ).lean();
  if (!user) return res.status(404).json({ error: "NotFound" });

  res.json({
    id: String(user._id),
    phone: user.phone,
    isPhoneVerified: user.isPhoneVerified,
    name: user.name ?? null,
    gender: user.gender ?? null,
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString() : null,
    roles: user.roles,
    createdAt: user.createdAt,
  });
});

export default router;
