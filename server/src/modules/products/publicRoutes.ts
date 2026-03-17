import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Product from "./productModel";
import OfferType from "../offerTypes/offerTypeModel";
import { BadRequestError, NotFoundError } from "../../shared/errors/httpErrors";
import { recordView, recordClick } from "./productMetricsService";

// ---------- helpers: cursor encode/decode ----------
function b64(j: unknown) {
  return Buffer.from(JSON.stringify(j)).toString("base64");
}
function unb64(s?: string | null) {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const router = Router();

/**
 * GET /api/v1/products
 * ?limit=20
 * ?sort=rank|new|popular
 * ?category=<categoryId>
 * ?subcategory=<subcategoryId>
 * ?offerTypeSlug=<slug>
 * ?hot=1
 * ?cursor=<base64>
 */
router.get("/", async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.enum(["rank", "new", "popular"]).default("rank"),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    offerTypeSlug: z.string().optional(),
    hot: z.coerce.number().optional(), // 1 -> только HOT (>=50%)
    cursor: z.string().optional(),
  });

  const parsed = schema.safeParse({ ...req.query });
  if (!parsed.success)
    throw new BadRequestError("Invalid query", parsed.error.flatten());

  const { limit, sort, category, subcategory, offerTypeSlug, hot, cursor } =
    parsed.data;

  // базовый фильтр: только активные, не удалённые
  const filter: any = { status: "active", deletedAt: { $exists: false } };

  if (category) {
    if (!Types.ObjectId.isValid(category))
      throw new BadRequestError("Invalid category");
    filter.mainCategoryId = new Types.ObjectId(category);
  }
  if (subcategory) {
    if (!Types.ObjectId.isValid(subcategory))
      throw new BadRequestError("Invalid subcategory");
    filter.subcategoryId = new Types.ObjectId(subcategory);
  }
  if (offerTypeSlug) {
    const ot = await OfferType.findOne({
      slug: offerTypeSlug,
      status: "active",
    })
      .select("_id")
      .lean();
    if (!ot) {
      // если тип не найден — сразу пустой ответ
      return res.json({ items: [], nextCursor: null });
    }
    filter.offerTypeId = ot._id;
  }
  if (hot === 1) {
    // discount >= 50% через $expr, избегаем деления на 0
    filter.$expr = {
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

  // сортировка + курсор
  const cur = unb64(cursor);
  let sortSpec: any = {};
  let cursorCond: any = null;

  if (sort === "rank") {
    sortSpec = { rankScore: -1, shuffleKey: 1, _id: 1 };
    if (
      cur &&
      typeof cur.rank === "number" &&
      typeof cur.shuffle === "number" &&
      typeof cur.id === "string"
    ) {
      const idOk = Types.ObjectId.isValid(cur.id)
        ? new Types.ObjectId(cur.id)
        : null;
      cursorCond = {
        $or: [
          { rankScore: { $lt: cur.rank } },
          { rankScore: cur.rank, shuffleKey: { $gt: cur.shuffle } },
          ...(idOk
            ? [
                {
                  rankScore: cur.rank,
                  shuffleKey: cur.shuffle,
                  _id: { $gt: idOk },
                },
              ]
            : []),
        ],
      };
    }
  } else if (sort === "new") {
    sortSpec = { createdAt: -1, _id: -1 };
    if (cur && typeof cur.ts === "number" && typeof cur.id === "string") {
      const idOk = Types.ObjectId.isValid(cur.id)
        ? new Types.ObjectId(cur.id)
        : null;
      cursorCond = {
        $or: [
          { createdAt: { $lt: new Date(cur.ts) } },
          ...(idOk
            ? [{ createdAt: new Date(cur.ts), _id: { $lt: idOk } }]
            : []),
        ],
      };
    }
  } else {
    // popular
    sortSpec = { views7d: -1, _id: 1 };
    if (cur && typeof cur.v7 === "number" && typeof cur.id === "string") {
      const idOk = Types.ObjectId.isValid(cur.id)
        ? new Types.ObjectId(cur.id)
        : null;
      cursorCond = {
        $or: [
          { views7d: { $lt: cur.v7 } },
          ...(idOk ? [{ views7d: cur.v7, _id: { $gt: idOk } }] : []),
        ],
      };
    }
  }

  const finalFilter = cursorCond ? { $and: [filter, cursorCond] } : filter;

  const docs = await Product.find(finalFilter)
    .sort(sortSpec)
    .limit(limit)
    .populate({ path: "sellerId", select: "companyName website" })
    .lean();

  const items = docs.map((d) => {
    const discountPercent =
      d.oldPrice > 0
        ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
        : 0;
    const isHot = discountPercent >= 50;
    const seller = (d as any).sellerId;
    return {
      id: String(d._id),
      title: d.title,
      photos: d.photos,
      price: d.price,
      oldPrice: d.oldPrice,
      discountPercent,
      isHot,
      offerTypeId: String(d.offerTypeId),
      mainCategoryId: String(d.mainCategoryId),
      subcategoryId: d.subcategoryId ? String(d.subcategoryId) : null,
      rankScore: d.rankScore,
      views7d: d.views7d,
      favoritesCount: d.favoritesCount,
      createdAt: d.createdAt,
      seller: seller
        ? {
            id: String(seller._id),
            companyName: seller.companyName,
            website: seller.website ?? null,
          }
        : null,
    };
  });

  const last = docs[docs.length - 1];
  let nextCursor: string | null = null;
  if (last && sort === "rank") {
    nextCursor = b64({
      rank: last.rankScore,
      shuffle: last.shuffleKey,
      id: String(last._id),
    });
  } else if (last && sort === "new") {
    nextCursor = b64({
      ts: new Date(last.createdAt).getTime(),
      id: String(last._id),
    });
  } else if (last && sort === "popular") {
    nextCursor = b64({ v7: last.views7d, id: String(last._id) });
  }

  res.json({ items, nextCursor });
});

/**
 * GET /api/v1/products/:id
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const d = await Product.findOne({
    _id: id,
    status: "active",
    deletedAt: { $exists: false },
  })
    .populate({ path: "sellerId", select: "companyName website" })
    .lean();
  if (!d) throw new NotFoundError("ProductNotFound");

  try {
    recordView(id);
  } catch {}

  const discountPercent =
    d.oldPrice > 0
      ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
      : 0;
  const seller = (d as any).sellerId;
  res.json({
    id: String(d._id),
    title: d.title,
    description: d.description ?? null,
    photos: d.photos,
    price: d.price,
    oldPrice: d.oldPrice,
    discountPercent,
    isHot: discountPercent >= 50,
    offerTypeId: String(d.offerTypeId),
    mainCategoryId: String(d.mainCategoryId),
    subcategoryId: d.subcategoryId ? String(d.subcategoryId) : null,
    externalUrl: d.externalUrl ?? null,
    views7d: d.views7d,
    views30d: d.views30d,
    favoritesCount: d.favoritesCount,
    clicksToExternal7d: d.clicksToExternal7d,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    seller: seller
      ? {
          id: String(seller._id),
          companyName: seller.companyName,
          website: seller.website ?? null,
        }
      : null,
  });
});

/**
 * GET /api/v1/products/similar/:id
 * Простая логика: такая же подкатегория (если есть) или категория + тот же offerType, исключая текущий товар.
 */
router.get("/similar/:id", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const p = await Product.findOne({
    _id: id,
    status: "active",
    deletedAt: { $exists: false },
  }).lean();
  if (!p) throw new NotFoundError("ProductNotFound");

  const filter: any = {
    _id: { $ne: p._id },
    status: "active",
    deletedAt: { $exists: false },
    offerTypeId: p.offerTypeId,
  };
  if (p.subcategoryId) {
    filter.subcategoryId = p.subcategoryId;
  } else {
    filter.mainCategoryId = p.mainCategoryId;
  }

  const docs = await Product.find(filter)
    .sort({ rankScore: -1, shuffleKey: 1, _id: 1 })
    .limit(12)
    .lean();

  const items = docs.map((d) => {
    const discountPercent =
      d.oldPrice > 0
        ? Math.max(0, Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100))
        : 0;
    return {
      id: String(d._id),
      title: d.title,
      photos: d.photos,
      price: d.price,
      oldPrice: d.oldPrice,
      discountPercent,
      isHot: discountPercent >= 50,
    };
  });

  res.json({ items });
});

router.post('/:id/click', async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');

  const d = await Product.findOne({ _id: id, status: 'active', deletedAt: { $exists: false } })
    .select('externalUrl')
    .lean();

  if (!d) throw new NotFoundError('ProductNotFound');

  try { recordClick(id); } catch {}

  res.json({ externalUrl: d.externalUrl ?? null });
});

export default router;
