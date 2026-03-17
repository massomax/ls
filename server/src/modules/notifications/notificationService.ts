import { Types } from "mongoose";
import Notification, {
  NotificationType,
  NotificationCategory,
} from "./notificationModel";
import User from "../users/userModel";
import config from "../../shared/config";
import sendSms from "../../infra/sms/smsAeroAdapter"; // у тебя уже есть адаптер
import logger from "../../shared/logger";

type BasePayload = {
  title: string;
  message?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  data?: Record<string, any>;
};

export async function sendInApp(
  userId: Types.ObjectId | string,
  payload: BasePayload
) {
  const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  const doc = await Notification.create({
    userId: uid,
    type: payload.type ?? "info",
    category: payload.category ?? "system",
    title: payload.title,
    message: payload.message,
    data: payload.data,
  });

  return doc;
}

async function maybeSms(userId: Types.ObjectId, text: string) {
  if (!config.notifications.smsEnabled) return;
  const u = await User.findById(userId).select("phone").lean();
  if (!u?.phone) return;
  try {
    await sendSms({ to: u.phone, text }); // <-- передаём объект
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[notify] sms failed");
  }
}

/* ======== Готовые сценарии ======== */

export async function notifySellerApplicationReceived(userId: Types.ObjectId) {
  await sendInApp(userId, {
    category: "seller",
    type: "info",
    title: "Заявка продавца получена",
    message: "Мы проверим данные и сообщим о результате модерации.",
  });
}

export async function notifySellerApproved(userId: Types.ObjectId) {
  await sendInApp(userId, {
    category: "seller",
    type: "success",
    title: "Ваша заявка одобрена",
    message: "Доступ к панели продавца открыт. Удачных продаж!",
  });
  if (config.notifications.smsSellerEvents) {
    await maybeSms(
      userId,
      "LastPiece: заявка продавца одобрена. Доступ открыт."
    );
  }
}

export async function notifySellerRejected(
  userId: Types.ObjectId,
  reason?: string
) {
  await sendInApp(userId, {
    category: "seller",
    type: "error",
    title: "Заявка продавца отклонена",
    message: reason ? `Причина: ${reason}` : undefined,
    data: reason ? { reason } : undefined,
  });
  if (config.notifications.smsSellerEvents) {
    await maybeSms(
      userId,
      `LastPiece: заявка продавца отклонена${reason ? ` (${reason})` : ""}.`
    );
  }
}

export async function notifySellerSuspended(userId: Types.ObjectId) {
  await sendInApp(userId, {
    category: "seller",
    type: "warning",
    title: "Аккаунт продавца заблокирован",
    message: "Свяжитесь с поддержкой для уточнения деталей.",
  });
  if (config.notifications.smsSellerEvents) {
    await maybeSms(userId, "LastPiece: аккаунт продавца заблокирован.");
  }
}

export async function notifySellerUnsuspended(userId: Types.ObjectId) {
  await sendInApp(userId, {
    category: "seller",
    type: "success",
    title: "Аккаунт продавца разблокирован",
  });
  if (config.notifications.smsSellerEvents) {
    await maybeSms(userId, "LastPiece: аккаунт продавца разблокирован.");
  }
}
