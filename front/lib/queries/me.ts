import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import { getMe, patchMe, type PatchMeBody, type UserMe } from "@/lib/api/users";

export function useMe() {
  return useQuery<UserMe, ApiError>({
    queryKey: ["me"],
    queryFn: getMe,
  });
}

export function usePatchMe() {
  const queryClient = useQueryClient();

  return useMutation<UserMe, ApiError, PatchMeBody>({
    mutationFn: patchMe,
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
    },
  });
}
