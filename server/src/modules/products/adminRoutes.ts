import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import Product from "./productModel";
import Seller from "../sellers/sellerModel";
import OfferType from "../offerTypes/offerTypeModel";
import Category from "../categories/categoryModel";
import Subcategory from "../subcategories/subcategoryModel";
import { getOfferTypeBoost, calcRankScore } from "./rank";

const router = Router();
router.use(authenticateJwt, authorize("admin"));

const oid = (s?: string) =>
  s && Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;

/* ================= LIST =================
GET /api/v1/admin/products
?status=all|draft|active|archived (default=all)
?q=строка         (по title)
?sellerId=...
?categoryId=...
?subcategoryId=...
?offerTypeId=...
?featured=1
?hot=1
?limit=50
?cursor=base64({_id})
sort: createdAt desc
*/
router.get("/", async (req, res) => {
  const schema = z.object({
    status: z
      .enum(["all", "draft", "pending", "active", "rejected", "archived"])
      .default("all"),
    q: z.string().optional(),
    sellerId: z.string().optional(),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    offerTypeId: z.string().optional(),
    featured: z.coerce.number().optional(),
    hot: z.coerce.number().optional(),
    limit: z.coerce.number().min(1).max(200).default(50),
    cursor: z.string().optional(),
  });
  const p = schema.safeParse({ ...req.query });
  if (!p.success) throw new BadRequestError("Invalid query", p.error.flatten());

  const {
    status,
    q,
    sellerId,
    categoryId,
    subcategoryId,
    offerTypeId,
    featured,
    hot,
    limit,
    cursor,
  } = p.data;

  const match: any = {};
  if (status !== "all") match.status = status;
  if (q)
    match.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (sellerId) match.sellerId = oid(sellerId) ?? undefined;
  if (categoryId) match.mainCategoryId = oid(categoryId) ?? undefined;
  if (subcategoryId) match.subcategoryId = oid(subcategoryId) ?? undefined;
  if (offerTypeId) match.offerTypeId = oid(offerTypeId) ?? undefined;
  if (featured === 1) match.isFeatured = true;
  if (hot === 1) {
    match.$expr = {
      $gte: [
        {
          $cond: [
            { $gt: ["$oldPrice", 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$oldPrice", "$price"] },
                    "$oldPrice",
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
        50,
      ],
    };
  }

  const cur = cursor
    ? (() => {
        try {
          return JSON.parse(
            Buffer.from(String(cursor), "base64").toString("utf8")
          );
        } catch {
          return null;
        }
      })()
    : null;
  if (cur?.id && Types.ObjectId.isValid(cur.id)) {
    match._id = { $lt: new Types.ObjectId(cur.id) }; // обратный порядок по createdAt/_id
  }

  const docs = await Product.find(match)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  res.json({
    items: docs.map((d) => ({
      id: String(d._id),
      title: d.title,
      status: d.status,
      price: d.price,
      oldPrice: d.oldPrice,
      discountPercent:
        d.oldPrice > 0
          ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
          : 0,
      sellerId: String(d.sellerId),
      mainCategoryId: String(d.mainCategoryId),
      subcategoryId: d.subcategoryId ? String(d.subcategoryId) : null,
      offerTypeId: String(d.offerTypeId),
      isFeatured: !!d.isFeatured,
      featuredUntil: d.featuredUntil ?? null,
      adminTags: d.adminTags ?? [],
      rankScore: d.rankScore,
      promotionUntil: d.promotionUntil ?? null,
      rankAdminBoost: d.rankAdminBoost ?? 0,
      createdAt: d.createdAt,
    })),
    nextCursor:
      docs.length === limit
        ? Buffer.from(
            JSON.stringify({ id: String(docs[docs.length - 1]._id) })
          ).toString("base64")
        : null,
  });
});

/* ============== DETAILS ============== */
router.get("/:id", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const d: any = await Product.findById(id).lean();
  if (!d) throw new NotFoundError("ProductNotFound");

  // подтянуть референсы (по желанию)
  const [seller, cat, sub, ot] = await Promise.all([
    Seller.findById(d.sellerId).select("companyName status").lean(),
    Category.findById(d.mainCategoryId).select("name").lean(),
    d.subcategoryId
      ? Subcategory.findById(d.subcategoryId).select("name").lean()
      : null,
    OfferType.findById(d.offerTypeId).select("name slug").lean(),
  ]);

  res.json({
    ...d,
    id: String(d._id),
    _id: undefined,
    seller: seller
      ? {
          id: String(seller._id),
          companyName: seller.companyName,
          status: seller.status,
        }
      : null,
    category: cat ? { id: String(cat._id), name: cat.name } : null,
    subcategory: sub ? { id: String(sub._id), name: sub.name } : null,
    offerType: ot ? { id: String(ot._id), name: ot.name, slug: ot.slug } : null,
  });
});

/* ============== PUBLISH/UNPUBLISH/ARCHIVE/RESTORE ============== */
async function setStatus(
  idStr: string,
  status: "draft" | "active" | "archived"
) {
  const id = oid(idStr);
  if (!id) throw new BadRequestError("Invalid id");
  const d = await Product.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        deletedAt: status === "archived" ? new Date() : undefined,
      },
    },
    { new: true }
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  return d;
}

router.patch("/:id/publish", async (req, res) =>
  res.json({
    id: String((await setStatus(req.params.id, "active"))._id),
    status: "active",
  })
);
router.patch("/:id/unpublish", async (req, res) =>
  res.json({
    id: String((await setStatus(req.params.id, "draft"))._id),
    status: "draft",
  })
);
router.patch("/:id/archive", async (req, res) =>
  res.json({
    id: String((await setStatus(req.params.id, "archived"))._id),
    status: "archived",
  })
);
router.patch("/:id/restore", async (req, res) =>
  res.json({
    id: String((await setStatus(req.params.id, "active"))._id),
    status: "active",
  })
);

/* ============== FEATURE TOGGLING ============== */
const featureSchema = z.object({
  featured: z.boolean(),
  featuredUntil: z.string().datetime().optional(), // ISO
});
router.patch("/:id/feature", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const p = featureSchema.safeParse(req.body);
  if (!p.success) throw new BadRequestError("Invalid body", p.error.flatten());

  const update: any = { isFeatured: p.data.featured };
  if (p.data.featuredUntil !== undefined)
    update.featuredUntil = p.data.featured
      ? new Date(p.data.featuredUntil)
      : undefined;

  const d = await Product.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  res.json({
    id: String(d._id),
    isFeatured: d.isFeatured,
    featuredUntil: d.featuredUntil ?? null,
  });
});

/* ============== ADMIN TAGS ============== */
const tagsSchema = z.object({
  tags: z
    .array(z.enum(["best", "popular", "new"]))
    .max(6)
    .default([]),
});
router.patch("/:id/tags", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const p = tagsSchema.safeParse(req.body);
  if (!p.success) throw new BadRequestError("Invalid body", p.error.flatten());

  const d = await Product.findByIdAndUpdate(
    id,
    { $set: { adminTags: p.data.tags } },
    { new: true }
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  res.json({ id: String(d._id), adminTags: d.adminTags });
});

/* ============== PROMOTION BOOST ============== */
const promoSchema = z.object({
  rankAdminBoost: z.coerce.number().min(0).max(1).default(0),
  until: z.string().datetime().optional(), // если нет — снимаем промо
});
router.patch("/:id/promotion", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const p = promoSchema.safeParse(req.body);
  if (!p.success) throw new BadRequestError("Invalid body", p.error.flatten());

  const update: any = { rankAdminBoost: p.data.rankAdminBoost };
  update.promotionUntil = p.data.until ? new Date(p.data.until) : undefined;

  // хотим сразу видеть эффект — пересчитаем rankScore сейчас (как в кроне, но без событий)
  const cur = await Product.findById(id)
    .select("oldPrice price offerTypeId favoritesCount")
    .lean();
  if (!cur) throw new NotFoundError("ProductNotFound");

  const baseBoost = await getOfferTypeBoost(cur.offerTypeId);
  const baseRank = calcRankScore(cur.oldPrice, cur.price, baseBoost);
  const bonusFavs = Math.min(0.3, (cur.favoritesCount || 0) / 100);
  const adminBoostActive =
    update.promotionUntil &&
    new Date(update.promotionUntil).getTime() > Date.now()
      ? update.rankAdminBoost
      : 0;
  const newRank = +(baseRank + bonusFavs + adminBoostActive).toFixed(6);

  const d = await Product.findByIdAndUpdate(
    id,
    { $set: { ...update, rankScore: newRank } },
    { new: true }
  ).lean();
  if (!d) throw new NotFoundError("ProductNotFound");

  res.json({
    id: String(d._id),
    rankAdminBoost: d.rankAdminBoost,
    promotionUntil: d.promotionUntil ?? null,
    rankScore: d.rankScore,
  });
});

/* ============== HARD DELETE (по необходимости) ============== */
router.delete("/:id", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const r = await Product.deleteOne({ _id: id });
  if (r.deletedCount === 0) throw new NotFoundError("ProductNotFound");
  res.sendStatus(204);
});

router.patch("/:id/approve", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const d = await Product.findById(id).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  if (d.status !== "pending") throw new ConflictError("NotPending");

  const upd = await Product.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "active",
        approvedAt: new Date(),
        rejectedAt: undefined,
        moderationNote: undefined,
        moderatedBy: new Types.ObjectId(req.user!.sub),
      },
    },
    { new: true }
  ).lean();

  res.json({ id: String(upd!._id), status: upd!.status });
});

const rejectSchema = z.object({ reason: z.string().max(400).optional() });

router.patch("/:id/reject", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const { reason } = rejectSchema.parse(req.body);

  const d = await Product.findById(id).lean();
  if (!d) throw new NotFoundError("ProductNotFound");
  if (d.status !== "pending") throw new ConflictError("NotPending");

  const upd = await Product.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "rejected",
        rejectedAt: new Date(),
        moderationNote: reason,
        approvedAt: undefined,
        moderatedBy: new Types.ObjectId(req.user!.sub),
      },
    },
    { new: true }
  ).lean();

  res.json({
    id: String(upd!._id),
    status: upd!.status,
    reason: upd!.moderationNote ?? null,
  });
});

export default router;
