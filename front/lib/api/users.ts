import { apiGet, apiPatch } from "./http";

export type UserMe = {
  id: string;
  phone: string;
  isPhoneVerified: boolean;
  name?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  roles: string[];
  createdAt: string;
};

export type PatchMeBody = {
  name?: string;
  gender?: string;
  birthDate?: string;
};

export async function getMe(): Promise<UserMe> {
  return apiGet<UserMe>("/users/me");
}

export async function patchMe(body: PatchMeBody): Promise<UserMe> {
  return apiPatch<UserMe>("/users/me", body);
}
