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
import Seller from "./sellerModel";
import User from "../users/userModel";
import {
  notifySellerApproved,
  notifySellerRejected,
  notifySellerSuspended,
  notifySellerUnsuspended,
} from "../notifications/notificationService";

const router = Router();
router.use(authenticateJwt, authorize("admin"));

// ------- helpers -------
const oid = (s: string) =>
  Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
async function addSellerRole(userId: Types.ObjectId) {
  await User.updateOne({ _id: userId }, { $addToSet: { roles: "seller" } });
}
async function removeSellerRole(userId: Types.ObjectId) {
  await User.updateOne({ _id: userId }, { $pull: { roles: "seller" } });
}

// ------- list with filters -------
router.get("/", async (req, res) => {
  const schema = z.object({
    status: z
      .enum(["pending", "active", "rejected", "suspended", "all"])
      .default("pending"),
    limit: z.coerce.number().min(1).max(200).default(50),
    cursor: z.string().optional(), // base64({_id})
    q: z.string().optional(), // поиск по companyName/inn/contactEmail/phone
  });
  const p = schema.safeParse({ ...req.query });
  if (!p.success) throw new BadRequestError("Invalid query", p.error.flatten());
  const { status, limit, cursor, q } = p.data;

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

  const match: any = {};
  if (status !== "all") match.status = status;

  if (cur?.id && Types.ObjectId.isValid(cur.id)) {
    match._id = { $gt: new Types.ObjectId(cur.id) };
  }

  // Агрегация с join пользователей (телефон/роли)
  const pipeline: any[] = [
    { $match: match },
    { $sort: { _id: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "u",
        pipeline: [{ $project: { phone: 1, roles: 1 } }],
      },
    },
    { $addFields: { user: { $first: "$u" } } },
    { $project: { u: 0 } },
  ];

  if (q && q.trim()) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    pipeline.unshift({
      $match: {
        $or: [{ companyName: rx }, { inn: rx }, { contactEmail: rx }],
      },
    });
    // Поиск по телефону через $lookup уже есть (отфильтруем после lookup)
    pipeline.push({
      $match: {
        $or: [
          { companyName: rx },
          { inn: rx },
          { contactEmail: rx },
          { "user.phone": rx },
        ],
      },
    });
  }

  const items = await Seller.aggregate(pipeline);

  res.json({
    items: items.map((s: any) => ({
      id: String(s._id),
      userId: String(s.userId),
      phone: s.user?.phone ?? null,
      roles: s.user?.roles ?? [],
      status: s.status,
      isVerified: s.isVerified,
      tier: s.tier,
      companyName: s.companyName,
      inn: s.inn,
      contactEmail: s.contactEmail ?? null,
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

// ------- details -------
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");

  const s = await Seller.findById(id).lean();
  if (!s) throw new NotFoundError("SellerNotFound");
  const u = await User.findById(s.userId).select("phone roles").lean();

  res.json({
    id: String(s._id),
    userId: String(s.userId),
    phone: u?.phone ?? null,
    roles: u?.roles ?? [],
    status: s.status,
    isVerified: s.isVerified,
    tier: s.tier,
    companyName: s.companyName,
    inn: s.inn,
    ogrn: s.ogrn ?? null,
    legalAddress: s.legalAddress ?? null,
    website: s.website ?? null,
    contactName: s.contactName ?? null,
    contactEmail: s.contactEmail ?? null,
    moderationNote: s.moderationNote ?? null,
    approvedAt: s.approvedAt ?? null,
    rejectedAt: s.rejectedAt ?? null,
    suspendedAt: s.suspendedAt ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
});

// ------- approve -------
router.patch("/:id/approve", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");

  const s = await Seller.findById(id);
  if (!s) throw new NotFoundError("SellerNotFound");
  if (s.status === "active")
    return res.json({ id: String(s._id), status: s.status });

  s.status = "active";
  s.isVerified = true;
  s.approvedAt = new Date();
  s.rejectedAt = undefined;
  s.suspendedAt = undefined;
  await s.save();
  await notifySellerApproved(s.userId);

  await addSellerRole(s.userId);

  res.json({ id: String(s._id), status: s.status, isVerified: s.isVerified });
});

// ------- reject -------
const rejectSchema = z.object({ reason: z.string().max(400).optional() });
router.patch("/:id/reject", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid body", parsed.error.flatten());

  const s = await Seller.findById(id);
  if (!s) throw new NotFoundError("SellerNotFound");

  s.status = "rejected";
  s.isVerified = false;
  s.rejectedAt = new Date();
  s.moderationNote = parsed.data.reason;
  await s.save();
  await notifySellerRejected(s.userId, parsed.data.reason);
  await removeSellerRole(s.userId);

  res.json({ id: String(s._id), status: s.status });
});

// ------- suspend / unsuspend -------
router.patch("/:id/suspend", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");

  const s = await Seller.findById(id);
  if (!s) throw new NotFoundError("SellerNotFound");

  s.status = "suspended";
  s.suspendedAt = new Date();
  await s.save();
  await notifySellerSuspended(s.userId);
  await removeSellerRole(s.userId);

  res.json({ id: String(s._id), status: s.status });
});

router.patch("/:id/unsuspend", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");

  const s = await Seller.findById(id);
  if (!s) throw new NotFoundError("SellerNotFound");

  s.status = "active";
  s.isVerified = true;
  s.suspendedAt = undefined;
  await s.save();
  await notifySellerUnsuspended(s.userId);
  await addSellerRole(s.userId);

  res.json({ id: String(s._id), status: s.status, isVerified: s.isVerified });
});

// ------- change tier -------
const tierSchema = z.object({ tier: z.enum(["free", "plus", "pro"]) });
router.patch("/:id/tier", async (req, res) => {
  const id = oid(req.params.id);
  if (!id) throw new BadRequestError("Invalid id");
  const parsed = tierSchema.safeParse(req.body);
  if (!parsed.success)
    throw new BadRequestError("Invalid body", parsed.error.flatten());

  const s = await Seller.findByIdAndUpdate(
    id,
    { $set: { tier: parsed.data.tier } },
    { new: true }
  );
  if (!s) throw new NotFoundError("SellerNotFound");

  res.json({ id: String(s._id), tier: s.tier });
});

export default router;
