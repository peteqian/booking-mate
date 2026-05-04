import { useMutation, useQueryClient } from "@tanstack/react-query";
import { replaceEventResources } from "@/lib/resources";
import type { UpdateEventResourcesRequest } from "@workspace/contracts";
import { resourceKeys } from "@/queries/resources";

export function useReplaceEventResources(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEventResourcesRequest) => replaceEventResources(eventId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: resourceKeys.eventList(eventId),
      });
    },
  });
}
