import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import Notification from "./notificationModel";
import { BadRequestError } from "../../shared/errors/httpErrors";

const router = Router();
router.use(authenticateJwt, authorize("user", "seller", "admin"));

/**
 * GET /api/v1/notifications?unread=1&limit=20&cursor=base64({_id})
 */
router.get("/", async (req, res) => {
  const schema = z.object({
    unread: z.coerce.number().optional(), // 1 -> только непрочитанные
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  });
  const p = schema.safeParse(req.query);
  if (!p.success) throw new BadRequestError("Invalid query", p.error.flatten());
  const { unread, limit, cursor } = p.data;

  const match: any = { userId: new Types.ObjectId(req.user!.sub) };
  if (unread === 1) match.isRead = false;

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

  const items = await Notification.find(match)
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  res.json({
    items: items.map((n) => ({
      id: String(n._id),
      category: n.category,
      type: n.type,
      title: n.title,
      message: n.message ?? null,
      data: n.data ?? null,
      isRead: n.isRead,
      createdAt: n.createdAt,
      readAt: n.readAt ?? null,
    })),
    nextCursor:
      items.length === limit
        ? Buffer.from(
            JSON.stringify({ id: String(items[items.length - 1]._id) })
          ).toString("base64")
        : null,
  });
});

/**
 * POST /api/v1/notifications/read { ids: [] }
 */
router.post("/read", async (req, res) => {
  const schema = z.object({ ids: z.array(z.string().min(8)).min(1) });
  const p = schema.safeParse(req.body);
  if (!p.success) throw new BadRequestError("Invalid body", p.error.flatten());

  const userId = new Types.ObjectId(req.user!.sub);
  const ids = p.data.ids
    .filter(Types.ObjectId.isValid)
    .map((s) => new Types.ObjectId(s));

  if (!ids.length) return res.json({ updated: 0 });

  const r = await Notification.updateMany(
    { _id: { $in: ids }, userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.json({ updated: r.modifiedCount ?? r.matchedCount ?? 0 });
});

/**
 * POST /api/v1/notifications/read-all
 */
router.post("/read-all", async (req, res) => {
  const userId = new Types.ObjectId(req.user!.sub);
  const r = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.json({ updated: r.modifiedCount ?? r.matchedCount ?? 0 });
});

/**
 * DELETE /api/v1/notifications/:id
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid id");
  await Notification.deleteOne({ _id: id, userId: req.user!.sub });
  res.sendStatus(204);
});

export default router;
