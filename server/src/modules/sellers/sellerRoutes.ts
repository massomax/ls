import { Router } from "express";
import { z } from "zod";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import Seller from "./sellerModel";
import Product from "../products/productModel";
import { notifySellerApplicationReceived } from "../notifications/notificationService";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import { Types } from "mongoose";

const router = Router();

// ---------- POST /api/v1/sellers/apply ----------
// Любой залогиненный пользователь может подать/обновить заявку.
// Если уже есть seller со статусом pending/active/suspended → 409.
// Если status === rejected → обновляем поля и переводим в pending.
const applySchema = z.object({
  companyName: z.string().min(2).max(120),
  inn: z.string().regex(/^\d{10,12}$/, "INN must be 10-12 digits"),
  ogrn: z
    .string()
    .regex(/^\d{13,15}$/, "OGRN must be 13-15 digits")
    .optional(),
  legalAddress: z.string().max(240).optional(),
  website: z.string().url().optional(),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().optional(),
});

router.post("/apply", authenticateJwt, async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid input", parsed.error.flatten());

  const userId = req.user!.sub;

  const existing = await Seller.findOne({ userId });
  if (existing) {
    if (["pending", "active", "suspended"].includes(existing.status)) {
      throw new ConflictError("AlreadyAppliedOrActive");
    }
    // rejected → можно переподать
    existing.set({ ...parsed.data, status: "pending" });
    await existing.save();
    await notifySellerApplicationReceived(new Types.ObjectId(req.user!.sub));
    return res.status(200).json({
      id: String(existing._id),
      status: existing.status,
    });
  }

  const created = await Seller.create({
    userId,
    ...parsed.data,
    status: "pending",
    isVerified: false,
    tier: "free",
  });

  res.status(201).json({ id: String(created._id), status: created.status });
});

// ---------- GET /api/v1/sellers/me ----------
// Возвращает профиль продавца (если есть). Доступен любому залогиненному.
// Если профиля нет → 404.
router.get("/me", authenticateJwt, async (req, res) => {
  const userId = req.user!.sub;
  const s = await Seller.findOne({ userId }).lean();
  if (!s) throw new NotFoundError("SellerProfileNotFound");

  res.json({
    id: String(s._id),
    status: s.status,
    isVerified: s.isVerified,
    tier: s.tier,
    companyName: s.companyName,
    inn: s.inn,
    ogrn: s.ogrn ?? null,
    legalAddress: s.legalAddress ?? null,
    website: s.website ?? null,
    contactName: s.contactName ?? null,
    contactEmail: s.contactEmail ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
});

// ---------- GET /api/v1/sellers/me/stats?period=7d|30d ----------
// Пока — заглушка. Требует роль seller/admin (будет назначаться после апрува админом).
const statsSchema = z.object({ period: z.enum(["7d", "30d"]).default("7d") });

router.get(
  "/me/stats",
  authenticateJwt,
  authorize("seller", "admin"),
  async (req, res) => {
    const userId = req.user!.sub;
    const s = await Seller.findOne({ userId }).lean();
    if (!s) throw new ForbiddenError("SellerProfileRequired");

    const docs = await Product.find({ sellerId: s._id })
      .select("status views7d views30d favoritesCount clicksToExternal7d")
      .lean();

    const total = docs.length;
    const active = docs.filter((d) => d.status === "active").length;
    const archived = docs.filter((d) => d.status === "archived").length;

    const views7d = docs.reduce((a, d) => a + (d.views7d || 0), 0);
    const views30d = docs.reduce((a, d) => a + (d.views30d || 0), 0);
    const favorites = docs.reduce((a, d) => a + (d.favoritesCount || 0), 0);
    const clicks7d = docs.reduce((a, d) => a + (d.clicksToExternal7d || 0), 0);

    res.json({
      period: "live", // агрегаты актуальны на момент запроса
      products: { total, active, archived },
      views7d,
      views30d,
      favorites,
      clicks7d,
    });
  }
);

export default router;
