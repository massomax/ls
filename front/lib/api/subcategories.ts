import { apiPost } from "./http";

export type ProposeSubcategoryInput = {
  parentCategoryId: string;
  name: string;
  description?: string;
};

export type ProposeSubcategoryResponse = {
  id: string;
  status: "pending";
  slug: string;
};

export async function proposeSubcategory(
  payload: ProposeSubcategoryInput,
): Promise<ProposeSubcategoryResponse> {
  return apiPost<ProposeSubcategoryResponse>("/subcategories/propose", payload);
}
