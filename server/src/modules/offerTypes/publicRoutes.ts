import { Router } from "express";
import { z } from "zod";
import OfferType from "./offerTypeModel";
import { Types } from "mongoose";

// курсор вида base64({"sort":number,"id":string})
function encodeCursor(v: { sort: number; id: string } | null) {
  return v ? Buffer.from(JSON.stringify(v)).toString("base64") : null;
}
function decodeCursor(s?: string | null) {
  if (!s) return null;
  try {
    const j = JSON.parse(Buffer.from(s, "base64").toString("utf8"));
    if (typeof j?.sort === "number" && typeof j?.id === "string")
      return j as { sort: number; id: string };
    return null;
  } catch {
    return null;
  }
}

const router = Router();

router.get("/", async (req, res) => {
  const schema = z.object({
    q: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().min(1).max(200).default(50),
    cursor: z.string().optional(),
  });
  const parsed = schema.safeParse({ ...req.query });
  if (!parsed.success) return res.status(400).json({ error: "BadRequest" });

  const { q, limit, cursor } = parsed.data;
  const cur = decodeCursor(cursor);

  const filter: any = { status: "active" };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { slug: rx }];
  }
  if (cur) {
    const afterId = Types.ObjectId.isValid(cur.id)
      ? new Types.ObjectId(cur.id)
      : null;
    filter.$or = filter.$or || [];
    filter.$or.push({ sortOrder: { $gt: cur.sort } });
    if (afterId)
      filter.$or.push({ sortOrder: cur.sort, _id: { $gt: afterId } });
  }

  const items = await OfferType.find(filter)
    .sort({ sortOrder: 1, _id: 1 })
    .limit(limit)
    .lean();

  res.json({
    items: items.map((o) => ({
      id: String(o._id),
      name: o.name,
      slug: o.slug,
      sortOrder: o.sortOrder,
      boostMultiplier: o.boostMultiplier,
      badgeText: o.badgeText ?? null,
      badgeColor: o.badgeColor ?? null,
      description: o.description ?? null,
    })),
    nextCursor:
      items.length === limit
        ? encodeCursor({
            sort: items[items.length - 1].sortOrder,
            id: String(items[items.length - 1]._id),
          })
        : null,
  });
});

export default router;
