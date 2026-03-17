import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import Product from "./productModel";
import Seller from "../sellers/sellerModel";
import { getOfferTypeBoost, calcRankScore } from "./rank";
import config from "../../shared/config";

// helpers
const oid = (s: string) =>
  Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
const encode = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString("base64");
const decode = (s?: string) => {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

async function requireActiveSeller(userId: string) {
  const s = await Seller.findOne({ userId }).lean();
  if (!s) throw new ForbiddenError("SellerProfileRequired");
  if (s.status !== "active") throw new ForbiddenError("SellerStatusNotActive");
  return s;
}

const router = Router();

// Все ниже — только для seller/admin
router.use(authenticateJwt, authorize("seller", "admin"));

/* ===================== LIST MY PRODUCTS ===================== */
/**
 * GET /api/v1/seller/products?status=all|draft|active|archived&limit=20&cursor=...
 * Сортировка: по _id возрастанию (удобная курсорная пагинация)
 */
router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);

  const schema = z.object({
    status: z.enum(["all", "draft", "active", "archived"]).default("all"),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
    q: z.string().optional(), // по title
  });
  const parsed = schema.safeParse({ ...req.query });
  if (!parsed.success)
    throw new BadRequestError("Invalid query", parsed.error.flatten());
  const { status, limit, cursor, q } = parsed.data;

  const filter: any = { sellerId: seller._id };
  if (status !== "all") filter.status = status;
  if (q)
    filter.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const cur = decode(cursor) as { id?: string } | null;
  if (cur?.id && Types.ObjectId.isValid(cur.id)) {
    filter._id = { $gt: new Types.ObjectId(cur.id) };
  }

  const docs = await Product.find(filter).sort({ _id: 1 }).limit(limit).lean();

  res.json({
    items: docs.map((d) => ({
      id: String(d._id),
      title: d.title,
      price: d.price,
      oldPrice: d.oldPrice,
      status: d.status,
      createdAt: d.createdAt,
      discountPercent:
        d.oldPrice > 0
          ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
          : 0,
    })),
    nextCursor:
      docs.length === limit
        ? encode({ id: String(docs[docs.length - 1]._id) })
        : null,
  });
});

/* ===================== CREATE PRODUCT ===================== */
const url = z.string().url();
const photoUrl = z.string().url();

const baseCreateSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  photos: z.array(photoUrl).max(config.uploads.maxFiles).default([]),

  oldPrice: z.coerce.number().gt(0),
  price: z.coerce.number().gte(0),

  mainCategoryId: z.string().min(8),
  subcategoryId: z.string().min(8).optional(),
  offerTypeId: z.string().min(8),

  externalUrl: url.optional(),
  status: z.enum(["draft", "active"]).default("active"),
});

const createSchema = baseCreateSchema.superRefine((data, ctx) => {
  if (!(data.oldPrice > data.price)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price"],
      message: "price must be < oldPrice",
    });
  }
});

router.post("/", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid body", parsed.error.flatten());
  const p = parsed.data;

  const mainCat = oid(p.mainCategoryId);
  const subCat = p.subcategoryId ? oid(p.subcategoryId) : null;
  const offerType = oid(p.offerTypeId);
  if (!mainCat || (p.subcategoryId && !subCat) || !offerType)
    throw new BadRequestError("Invalid ids");

  const boost = await getOfferTypeBoost(offerType);
  const rank = calcRankScore(p.oldPrice, p.price, boost);

  const doc = await Product.create({
    sellerId: seller._id,
    title: p.title,
    description: p.description,
    photos: p.photos ?? [],
    oldPrice: p.oldPrice,
    price: p.price,
    mainCategoryId: mainCat,
    subcategoryId: subCat ?? undefined,
    offerTypeId: offerType,
    externalUrl: p.externalUrl,
    status: "draft",
    views7d: 0,
    views30d: 0,
    favoritesCount: 0,
    clicksToExternal7d: 0,
    rankScore: rank,
    shuffleKey: Math.random(),
  });

  res.status(201).json({ id: String(doc._id) });
});

/* ===================== READ ONE (OWN) ===================== */
router.get("/:id", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);

  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const d = await Product.findOne({ _id: id, sellerId: seller._id }).lean();
  if (!d) throw new NotFoundError("ProductNotFound");

  const discountPercent =
    d.oldPrice > 0
      ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
      : 0;

  res.json({
    id: String(d._id),
    title: d.title,
    description: d.description ?? null,
    photos: d.photos,
    oldPrice: d.oldPrice,
    price: d.price,
    discountPercent,
    mainCategoryId: String(d.mainCategoryId),
    subcategoryId: d.subcategoryId ? String(d.subcategoryId) : null,
    offerTypeId: String(d.offerTypeId),
    externalUrl: d.externalUrl ?? null,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  });
});

/* ===================== UPDATE (PATCH) ===================== */
const patchSchema = baseCreateSchema.partial().strict();

router.patch("/:id", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);

  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid body", parsed.error.flatten());
  const p = parsed.data;

  const update: any = {};
  if (p.title !== undefined) update.title = p.title;
  if (p.description !== undefined) update.description = p.description;
  if (p.photos !== undefined) update.photos = p.photos;

  let priceChanged = false;
  if (p.oldPrice !== undefined) {
    update.oldPrice = p.oldPrice;
    priceChanged = true;
  }
  if (p.price !== undefined) {
    update.price = p.price;
    priceChanged = true;
  }

  if (p.mainCategoryId !== undefined) {
    const v = oid(p.mainCategoryId);
    if (!v) throw new BadRequestError("Invalid mainCategoryId");
    update.mainCategoryId = v;
  }
  if (p.subcategoryId !== undefined) {
    const v = p.subcategoryId ? oid(p.subcategoryId) : null;
    if (p.subcategoryId && !v)
      throw new BadRequestError("Invalid subcategoryId");
    update.subcategoryId = v ?? undefined;
  }
  if (p.offerTypeId !== undefined) {
    const v = oid(p.offerTypeId);
    if (!v) throw new BadRequestError("Invalid offerTypeId");
    update.offerTypeId = v;
    priceChanged = true; // ранк зависит от буста offerType
  }
  if (p.externalUrl !== undefined) update.externalUrl = p.externalUrl;
  if (p.status !== undefined) update.status = p.status;

  // проверка инварианта скидки, если изменили цены
  if (p.oldPrice !== undefined || p.price !== undefined) {
    const newOld = p.oldPrice ?? undefined;
    const newPrice = p.price ?? undefined;
    // Подгружаем текущие цены, чтобы сравнить корректно
    const current = await Product.findOne({ _id: id, sellerId: seller._id })
      .select("oldPrice price offerTypeId")
      .lean();
    if (!current) throw new NotFoundError("ProductNotFound");

    const oldPrice = newOld ?? current.oldPrice;
    const price = newPrice ?? current.price;
    if (!(oldPrice > price))
      throw new BadRequestError("price must be < oldPrice");

    // Пересчёт rankScore при изменении цен/offerType
    if (priceChanged) {
      const offerTypeId = update.offerTypeId ?? current.offerTypeId;
      const boost = await getOfferTypeBoost(offerTypeId);
      update.rankScore = calcRankScore(oldPrice, price, boost);
    }
  }

  const doc = await Product.findOneAndUpdate(
    { _id: id, sellerId: seller._id },
    { $set: update },
    { new: true },
  ).lean();

  if (!doc) throw new NotFoundError("ProductNotFound");
  res.json({ id: String(doc._id) });
});

/* ===================== PUBLISH / UNPUBLISH ===================== */
router.patch("/:id/publish", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const d = await Product.findOneAndUpdate(
    { _id: id, sellerId: seller._id, status: { $in: ["draft", "rejected"] } },
    {
      $set: {
        status: "pending",
        // сброс причин прошлой модерации
        moderationNote: undefined,
        approvedAt: undefined,
        rejectedAt: undefined,
        moderatedBy: undefined,
      },
    },
    { new: true },
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  res.json({ id: String(d._id), status: d.status });
});

router.patch("/:id/unpublish", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const d = await Product.findOneAndUpdate(
    { _id: id, sellerId: seller._id },
    { $set: { status: "draft" } },
    { new: true },
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  res.json({ id: String(d._id), status: d.status });
});

/* ===================== DELETE (SOFT) ===================== */
router.delete("/:id", async (req, res) => {
  const userId = req.user!.sub;
  const seller = await requireActiveSeller(userId);
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  await Product.updateOne(
    { _id: id, sellerId: seller._id },
    { $set: { status: "archived", deletedAt: new Date() } },
  );
  res.sendStatus(204);
});

export default router;
