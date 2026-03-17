import OfferType from "../offerTypes/offerTypeModel";

/**
 * Буст по типу предложения
 */
export async function getOfferTypeBoost(offerTypeId: any): Promise<number> {
  const ot = await OfferType.findById(offerTypeId)
    .select("boostMultiplier")
    .lean();
  return ot?.boostMultiplier ?? 1.0;
}

/**
 * Рассчёт rankScore: чем больше скидка — тем выше ранг.
 * Простая формула: rank = discount(0..1) * boost(по OfferType).
 */
export function calcRankScore(
  oldPrice: number,
  price: number,
  boost: number
): number {
  if (!oldPrice || oldPrice <= 0) return 0;
  const discount = Math.max(0, Math.min(1, (oldPrice - price) / oldPrice));
  return +(discount * Math.max(0.1, Math.min(5, boost))).toFixed(6);
}
