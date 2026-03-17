import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import Subcategory from "./subcategoryModel";
import Category from "../categories/categoryModel";
import Product from "../products/productModel";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../../shared/errors/httpErrors";
import { slugify } from "../../shared/utils/slug";

const router = Router();
router.use(authenticateJwt, authorize("admin"));

const toId = (s?: string) =>
  s && Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;

/* ---------- GET /api/v1/admin/subcategories/pending ---------- */
router.get("/pending", async (req, res) => {
  const schema = z.object({
    categoryId: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    cursor: z.string().optional(), // base64({id})
  });
  const p = schema.safeParse(req.query);
  if (!p.success) throw new BadRequestError("Invalid query", p.error.flatten());
  const { categoryId, limit, cursor } = p.data;

  const match: any = { status: "pending" };
  if (categoryId) {
    const cid = toId(categoryId);
    if (!cid) throw new BadRequestError("Invalid categoryId");
    match.parentCategoryId = cid;
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
    match._id = { $lt: new Types.ObjectId(cur.id) };
  }

  const items = await Subcategory.find(match)
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  res.json({
    items: items.map((s) => ({
      id: String(s._id),
      parentCategoryId: String(s.parentCategoryId),
      name: s.name,
      slug: s.slug,
      createdBy: s.createdBy,
      proposedBySellerId: s.proposedBySellerId
        ? String(s.proposedBySellerId)
        : null,
      description: s.description ?? null,
      createdAt: s.createdAt,
    })),
    nextCursor:
      items.length === limit
        ? Buffer.from(
            JSON.stringify({ id: String(items[items.length - 1]._id) })
          ).toString("base64")
        : null,
  });
});

/* ---------- PATCH /:id/approve ---------- */
router.patch("/:id/approve", async (req, res) => {
  const id = toId(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");

  const body = z
    .object({
      name: z.string().min(2).max(64).optional(),
      slug: z.string().min(2).max(120).optional(),
      description: z.string().max(500).optional(),
    })
    .parse(req.body);

  const doc = await Subcategory.findById(id).lean();
  if (!doc) throw new NotFoundError("SubcategoryNotFound");
  if (doc.status !== "pending") throw new ConflictError("NotPending");

  // name/slug можно поправить на этапе апрува
  const name = body.name ?? doc.name;
  const slug = slugify(body.slug ?? name);

  try {
    const upd = await Subcategory.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "active",
          name,
          slug,
          description: body.description ?? doc.description,
          reason: undefined,
        },
      },
      { new: true }
    ).lean();

    res.json({
      id: String(upd!._id),
      status: upd!.status,
      name: upd!.name,
      slug: upd!.slug,
    });
  } catch (e: any) {
    // partial unique по active гарантирует конфликт только со статусом active
    if (e?.code === 11000) throw new ConflictError("DuplicateSlugInCategory");
    throw e;
  }
});

/* ---------- PATCH /:id/reject ---------- */
/* В твоей модели нет статуса 'rejected' — используем archived + reason */
router.patch("/:id/reject", async (req, res) => {
  const id = toId(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const { reason } = z
    .object({ reason: z.string().max(500).optional() })
    .parse(req.body);

  const doc = await Subcategory.findByIdAndUpdate(
    id,
    { $set: { status: "archived", reason: reason ?? "rejected" } },
    { new: true }
  ).lean();
  if (!doc) throw new NotFoundError("SubcategoryNotFound");

  res.json({ id: String(doc._id), status: doc.status });
});

/* ---------- PATCH /:id/merge  { targetId } ---------- */
router.patch("/:id/merge", async (req, res) => {
  const sourceId = toId(req.params.id);
  if (!sourceId) throw new BadRequestError("Invalid id");

  const { targetId } = z
    .object({ targetId: z.string().min(8) })
    .parse(req.body);
  const target = toId(targetId);
  if (!target) throw new BadRequestError("Invalid targetId");
  if (String(sourceId) === String(target)) throw new BadRequestError("SameId");

  const src = await Subcategory.findById(sourceId).lean();
  if (!src) throw new NotFoundError("SubcategoryNotFound");

  const dst = await Subcategory.findById(target).lean();
  if (!dst) throw new NotFoundError("TargetNotFound");
  if (String(src.parentCategoryId) !== String(dst.parentCategoryId))
    throw new ConflictError("DifferentParentCategory");
  if (dst.status !== "active") throw new ConflictError("TargetNotActive");

  // переносим товары
  const r = await Product.updateMany(
    { subcategoryId: sourceId },
    { $set: { subcategoryId: target } }
  );

  // архивируем src и запоминаем mergedToId + сколько перенесено
  await Subcategory.updateOne(
    { _id: sourceId },
    {
      $set: {
        status: "archived",
        mergedToId: target,
        reason: `merged (${r.modifiedCount} products)`,
      },
    }
  );

  res.json({
    mergedFrom: String(sourceId),
    mergedTo: String(target),
    movedProducts: r.modifiedCount,
  });
});

/* ---------- PATCH /:id/archive  (reason?) ---------- */
router.patch("/:id/archive", async (req, res) => {
  const id = toId(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const { reason } = z
    .object({ reason: z.string().max(500).optional() })
    .parse(req.body);

  const d = await Subcategory.findByIdAndUpdate(
    id,
    { $set: { status: "archived", reason: reason ?? "archived" } },
    { new: true }
  ).lean();
  if (!d) throw new NotFoundError("SubcategoryNotFound");

  res.json({ id: String(d._id), status: d.status });
});

/* ---------- PATCH /:id/restore ---------- */
router.patch("/:id/restore", async (req, res) => {
  const id = toId(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");

  const d = await Subcategory.findById(id).lean();
  if (!d) throw new NotFoundError("SubcategoryNotFound");
  if (d.status !== "archived") throw new ConflictError("NotArchived");

  try {
    await Subcategory.updateOne(
      { _id: id },
      { $set: { status: "active", reason: undefined } }
    );
  } catch (e: any) {
    if (e?.code === 11000) throw new ConflictError("DuplicateSlugInCategory");
    throw e;
  }

  res.json({ id: String(id), status: "active" });
});

export default router;
