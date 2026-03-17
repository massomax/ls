export interface SmsProvider {
  sendSms(params: { to: string; text: string }): Promise<void>;
}
