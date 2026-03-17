import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import Category from "../categories/categoryModel";
import Subcategory from "./subcategoryModel";
import Seller from "../sellers/sellerModel";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import { slugify } from "../../shared/utils/slug";

const router = Router();

// Только seller/admin
router.post(
  "/propose",
  authenticateJwt,
  authorize("seller", "admin"),
  async (req, res) => {
    const schema = z.object({
      parentCategoryId: z.string().min(8),
      name: z.string().min(2).max(64),
      description: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      throw new BadRequestError("Invalid input", parsed.error.flatten());

    const { parentCategoryId, name, description } = parsed.data;
    if (!Types.ObjectId.isValid(parentCategoryId))
      throw new BadRequestError("Invalid parentCategoryId");

    // проверяем, что категория существует и активна
    const cat = await Category.findOne({
      _id: parentCategoryId,
      status: "active",
    });
    if (!cat) throw new NotFoundError("CategoryNotFound");

    // проверяем, что у пользователя есть seller-профиль
    const seller = await Seller.findOne({ userId: req.user!.sub });
    if (!seller) throw new ForbiddenError("SellerProfileRequired");

    const slug = slugify(name);

    try {
      const created = await Subcategory.create({
        parentCategoryId,
        name,
        slug,
        status: "pending",
        createdBy: "seller",
        proposedBySellerId: seller._id,
        description,
      });
      res.status(201).json({
        id: String(created._id),
        status: created.status,
        slug: created.slug,
      });
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictError("SlugAlreadyExistsForCategory");
      throw e;
    }
  }
);

export default router;
