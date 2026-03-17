import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import { uploadImages, type UploadImagesResponse } from "@/lib/api/uploads";

export function useUploadImages() {
  return useMutation<UploadImagesResponse, ApiError, File[]>({
    mutationFn: (files) => uploadImages(files),
  });
}
