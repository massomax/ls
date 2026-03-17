import { apiRequest } from "./http";

export type UploadImageItem = {
  url: string;
  deleteHash: string;
  id: string;
  originalName: string;
  size: number;
  mime: string;
};

export type UploadImagesResponse = {
  items: UploadImageItem[];
};

export async function uploadImages(
  files: File[],
): Promise<UploadImagesResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  return apiRequest<UploadImagesResponse>("/uploads/images", {
    method: "POST",
    body: formData,
  });
}
