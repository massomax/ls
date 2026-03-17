import { Router } from "express";
import { z } from "zod";
import Category from "./categoryModel";
import Subcategory from "../subcategories/subcategoryModel";
import { Types } from "mongoose";

const router = Router();

// Список активных категорий
router.get("/", async (_req, res) => {
  const cats = await Category.find({ status: "active" })
    .sort({ sortOrder: 1, _id: 1 })
    .lean();
  res.json({
    items: cats.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      svgUrl: c.svgUrl,
      sortOrder: c.sortOrder,
      description: c.description ?? null,
    })),
  });
});

// Получить подкатегории по id категории (активные)
router.get("/:categoryId/subcategories", async (req, res) => {
  const id = req.params.categoryId;
  if (!Types.ObjectId.isValid(id))
    return res.status(400).json({ error: "BadRequest" });

  const subs = await Subcategory.find({
    parentCategoryId: id,
    status: "active",
  })
    .sort({ name: 1, _id: 1 })
    .lean();

  res.json({
    items: subs.map((s) => ({
      id: String(s._id),
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
    })),
  });
});

// (опционально) Получить категорию по slug
router.get("/by-slug/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  const c = await Category.findOne({ slug, status: "active" }).lean();
  if (!c) return res.status(404).json({ error: "NotFound" });
  res.json({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    svgUrl: c.svgUrl,
    sortOrder: c.sortOrder,
    description: c.description ?? null,
  });
});

export default router;
