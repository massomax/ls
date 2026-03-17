export function normalizeE164(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  // если пользователь ввёл уже с '+', просто вернём '+' + цифры
  return "+" + digits;
}
