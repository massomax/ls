import { Types } from 'mongoose';
import ProductEvent from './productEventModel';

export async function recordView(productId: string) {
  if (!Types.ObjectId.isValid(productId)) return;
  await ProductEvent.create({ productId, type: 'view' });
}

export async function recordClick(productId: string) {
  if (!Types.ObjectId.isValid(productId)) return;
  await ProductEvent.create({ productId, type: 'click' });
}
  