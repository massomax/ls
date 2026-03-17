import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Favorite from "./favoriteModel";
import authenticateJwt from "../../shared/http/authenticateJwt";
import { BadRequestError, ConflictError } from "../../shared/errors/httpErrors";
import Product from "../products/productModel";

// простая base64-курсор пагинация по _id
function encodeCursor(id: string | null) {
  return id ? Buffer.from(JSON.stringify({ id })).toString("base64") : null;
}
function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const j = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    return typeof j?.id === "string" ? j.id : null;
  } catch {
    return null;
  }
}

const router = Router();

// все роуты — только с JWT
router.use(authenticateJwt);

// GET /api/v1/users/me/favorites?cursor?&limit?
router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  const afterId = decodeCursor(req.query.cursor as string | undefined);

  const filter: any = { userId: new Types.ObjectId(userId) };
  if (afterId && Types.ObjectId.isValid(afterId)) {
    filter._id = { $gt: new Types.ObjectId(afterId) };
  }

  const items = await Favorite.find(filter)
    .sort({ _id: 1 })
    .limit(limit)
    .lean();

  res.json({
    items: items.map((i) => ({
      id: String(i._id),
      productId: String(i.productId),
      createdAt: i.createdAt,
    })),
    nextCursor:
      items.length === limit
        ? encodeCursor(String(items[items.length - 1]._id))
        : null,
  });
});

const addSchema = z.object({ productId: z.string().min(8) });

// POST /api/v1/users/me/favorites  { productId }
router.post("/", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid input");

  const { productId } = parsed.data;
  if (!Types.ObjectId.isValid(productId))
    throw new BadRequestError("Invalid productId");

  try {
    const doc = await Favorite.create({
      userId: new Types.ObjectId(req.user!.sub),
      productId: new Types.ObjectId(productId),
    });
    await Product.updateOne(
      { _id: doc.productId },
      { $inc: { favoritesCount: 1 } }
    );
    res.status(201).json({
      id: String(doc._id),
      productId: String(doc.productId),
      createdAt: doc.createdAt,
    });
  } catch (e: any) {
    if (e?.code === 11000) throw new ConflictError("AlreadyInFavorites");
    throw e;
  }
});

// DELETE /api/v1/users/me/favorites/:productId
router.delete("/:productId", async (req, res) => {
  const { productId } = req.params;
  if (!Types.ObjectId.isValid(productId))
    throw new BadRequestError("Invalid productId");

  const r = await Favorite.deleteOne({
    userId: new Types.ObjectId(req.user!.sub),
    productId: new Types.ObjectId(productId),
  });
  // 204, даже если уже было удалено
  if (r.deletedCount && r.deletedCount > 0) {
    await Product.updateOne(
      { _id: req.params.productId },
      { $inc: { favoritesCount: -1 } }
    );
  }
  res.sendStatus(204);
});

export default router;
