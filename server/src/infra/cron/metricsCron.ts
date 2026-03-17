import cron from "node-cron";
import ProductEvent from "../../modules/products/productEventModel";
import Product from "../../modules/products/productModel";
import { getOfferTypeBoost, calcRankScore } from "../../modules/products/rank";

// Расчёт каждые 30 минут
export function startMetricsCron() {
  // minute */30, every hour
  cron.schedule("*/30 * * * *", async () => {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    try {
      // views 7d
      const v7 = await ProductEvent.aggregate([
        { $match: { type: "view", ts: { $gte: d7 } } },
        { $group: { _id: "$productId", c: { $count: {} } } },
      ]);
      // views 30d
      const v30 = await ProductEvent.aggregate([
        { $match: { type: "view", ts: { $gte: d30 } } },
        { $group: { _id: "$productId", c: { $count: {} } } },
      ]);
      // clicks 7d
      const c7 = await ProductEvent.aggregate([
        { $match: { type: "click", ts: { $gte: d7 } } },
        { $group: { _id: "$productId", c: { $count: {} } } },
      ]);

      // Быстрый словарь по результатам
      const map7 = new Map(v7.map((x: any) => [String(x._id), x.c]));
      const map30 = new Map(v30.map((x: any) => [String(x._id), x.c]));
      const mapC7 = new Map(c7.map((x: any) => [String(x._id), x.c]));

      // Пройдём по всем продуктам партиями
      const cursor = Product.find({})
        .select(
          "_id oldPrice price offerTypeId favoritesCount promotionUntil rankAdminBoost"
        )
        .lean()
        .cursor();

      for await (const p of cursor as any) {
        const id = String(p._id);
        const views7d = map7.get(id) ?? 0;
        const views30d = map30.get(id) ?? 0;
        const clicks7d = mapC7.get(id) ?? 0;

        // базовый ранг (скидка * буст OfferType)
        const boost = await getOfferTypeBoost(p.offerTypeId);
        let rank = calcRankScore(p.oldPrice, p.price, boost);

        // популярность
        const bonusViews = Math.min(0.2, Math.log10(views7d + 1) / 10);
        const bonusFavs = Math.min(0.3, (p.favoritesCount || 0) / 100);

        // админский буст (если ещё действует)
        const nowMs = Date.now();
        const adminBoostActive =
          p.promotionUntil && new Date(p.promotionUntil).getTime() > nowMs
            ? p.rankAdminBoost || 0
            : 0;

        rank = +(rank + bonusViews + bonusFavs + adminBoostActive).toFixed(6);

        await Product.updateOne(
          { _id: p._id },
          {
            $set: {
              views7d,
              views30d,
              clicksToExternal7d: clicks7d,
              rankScore: rank,
            },
          }
        );
      }

      console.log(`[cron] metrics updated at ${now.toISOString()}`);
    } catch (e) {
      console.error("[cron] metrics failed:", (e as Error).message);
    }
  });
}
