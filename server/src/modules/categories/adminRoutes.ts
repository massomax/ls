import { Router } from "express";
import { z } from "zod";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import Category from "./categoryModel";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import { Types } from "mongoose";

const router = Router();
router.use(authenticateJwt, authorize("admin"));

const slugRx = /^[a-z0-9_-]{2,64}$/;

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(slugRx),
  svgUrl: z.string().url(),
  sortOrder: z.coerce.number().min(-1_000_000).max(1_000_000).default(0),
  description: z.string().max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid input", parsed.error.flatten());

  try {
    const created = await Category.create(parsed.data);
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
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true }
    );
    if (!updated) throw new NotFoundError("CategoryNotFound");
    res.json({
      id: String(updated._id),
      name: updated.name,
      slug: updated.slug,
      svgUrl: updated.svgUrl,
      status: updated.status,
      sortOrder: updated.sortOrder,
      description: updated.description ?? null,
    });
  } catch (e: any) {
    if (e?.code === 11000) throw new ConflictError("SlugAlreadyExists");
    throw e;
  }
});

router.patch("/:id/archive", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");
  const doc = await Category.findByIdAndUpdate(
    id,
    { $set: { status: "archived" } },
    { new: true }
  );
  if (!doc) throw new NotFoundError("CategoryNotFound");
  res.json({ id: String(doc._id), status: doc.status });
});

router.patch("/:id/restore", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");
  const doc = await Category.findByIdAndUpdate(
    id,
    { $set: { status: "active" } },
    { new: true }
  );
  if (!doc) throw new NotFoundError("CategoryNotFound");
  res.json({ id: String(doc._id), status: doc.status });
});

export default router;
