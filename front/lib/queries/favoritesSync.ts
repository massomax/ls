import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  addFavorite,
  removeFavorite,
  type FavoriteItem,
} from "@/lib/api/favorites";

export function useAddFavorite() {
  return useMutation<FavoriteItem, ApiError, string>({
    mutationFn: addFavorite,
  });
}

export function useRemoveFavorite() {
  return useMutation<void, ApiError, string>({
    mutationFn: removeFavorite,
  });
}
