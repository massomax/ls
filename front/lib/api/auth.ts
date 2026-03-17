import { apiPost } from "./http";

export type LoginSmsRequestBody = {
  phone: string;
};

export type LoginSmsVerifyBody = {
  phone: string;
  code: string;
};

export type LoginSmsVerifyResponse = {
  accessToken: string;
  roles: string[];
};

export async function loginSmsRequest(
  body: LoginSmsRequestBody,
): Promise<void> {
  return apiPost<void>("/auth/login-sms/request", body);
}

export async function loginSmsVerify(
  body: LoginSmsVerifyBody,
): Promise<LoginSmsVerifyResponse> {
  return apiPost<LoginSmsVerifyResponse>("/auth/login-sms/verify", body);
}

export async function logout(): Promise<void> {
  return apiPost<void>("/auth/logout");
}
