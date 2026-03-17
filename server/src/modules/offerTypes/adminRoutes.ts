import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import OfferType from "./offerTypeModel";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/httpErrors";

const router = Router();

// все ниже — только admin
router.use(authenticateJwt, authorize("admin"));

const slugRx = /^[a-z0-9_-]{2,32}$/;

const createSchema = z.object({
  name: z.string().min(2).max(40),
  slug: z.string().regex(slugRx, "slug must be [a-z0-9_-] 2..32"),
  sortOrder: z.coerce.number().min(-1_000_000).max(1_000_000).default(0),
  boostMultiplier: z.coerce.number().min(0.1).max(5).default(1.0),
  badgeText: z.string().max(16).optional(),
  badgeColor: z.string().max(16).optional(),
  description: z.string().max(200).optional(),
  status: z.enum(["active", "archived", "pending"]).optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid input", parsed.error.flatten());

  try {
    const created = await OfferType.create(parsed.data);
    res.status(201).json({ id: String(created._id) });
  } catch (e: any) {
    if (e?.code === 11000) throw new ConflictError("SlugAlreadyExists");
    throw e;
  }
});

const patchSchema = createSchema.partial();

router.patch("/:id", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid input", parsed.error.flatten());

  try {
    const doc = await OfferType.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true }
    );
    if (!doc) throw new NotFoundError("OfferTypeNotFound");
    res.json({
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      status: doc.status,
      sortOrder: doc.sortOrder,
      boostMultiplier: doc.boostMultiplier,
      badgeText: doc.badgeText ?? null,
      badgeColor: doc.badgeColor ?? null,
      description: doc.description ?? null,
    });
  } catch (e: any) {
    if (e?.code === 11000) throw new ConflictError("SlugAlreadyExists");
    throw e;
  }
});

router.patch("/:id/archive", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");
  const doc = await OfferType.findByIdAndUpdate(
    id,
    { $set: { status: "archived" } },
    { new: true }
  );
  if (!doc) throw new NotFoundError("OfferTypeNotFound");
  res.json({ id: String(doc._id), status: doc.status });
});

router.patch("/:id/restore", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");
  const doc = await OfferType.findByIdAndUpdate(
    id,
    { $set: { status: "active", mergedToId: undefined } },
    { new: true }
  );
  if (!doc) throw new NotFoundError("OfferTypeNotFound");
  res.json({ id: String(doc._id), status: doc.status });
});

// Заготовка MERGE: помечаем исходный как archived + mergedToId.
// Перенос products.offerTypeId подключим на шаге с товарами.
const mergeSchema = z.object({ targetId: z.string().min(8) });

router.patch("/:id/merge", async (req, res) => {
  const srcId = req.params.id;
  if (!Types.ObjectId.isValid(srcId)) throw new BadRequestError("Invalid id");
  const parsed = mergeSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequestError("Invalid input");

  const { targetId } = parsed.data;
  if (!Types.ObjectId.isValid(targetId))
    throw new BadRequestError("Invalid targetId");
  if (srcId === targetId) throw new BadRequestError("SameId");

  const target = await OfferType.findById(targetId);
  if (!target) throw new NotFoundError("TargetNotFound");

  const updated = await OfferType.findByIdAndUpdate(
    srcId,
    { $set: { status: "archived", mergedToId: target._id } },
    { new: true }
  );
  if (!updated) throw new NotFoundError("OfferTypeNotFound");

  res.json({ mergedFrom: String(updated._id), mergedTo: String(target._id) });
});

export default router;
