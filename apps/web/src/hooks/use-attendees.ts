import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAttendee } from "@/lib/attendees";
import { attendeeKeys } from "@/queries/attendees";

export function useCreateAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAttendee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attendeeKeys.lists() });
    },
  });
}
