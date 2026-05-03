import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteRegistration, updateRegistration } from "@/lib/registrations";
import type { RegistrationWithAttendeeDto } from "@workspace/contracts";
import { registrationKeys } from "@/queries/registrations";

export function useUpdateRegistration(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RegistrationWithAttendeeDto["status"] }) =>
      updateRegistration(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({
        queryKey: registrationKeys.list(eventId),
      });

      const previousRegistrations = queryClient.getQueryData<{
        registrations: RegistrationWithAttendeeDto[];
      }>(registrationKeys.list(eventId));

      if (previousRegistrations) {
        queryClient.setQueryData(registrationKeys.list(eventId), {
          registrations: previousRegistrations.registrations.map((r) =>
            r.id === id ? { ...r, status } : r,
          ),
        });
      }

      return { previousRegistrations };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRegistrations) {
        queryClient.setQueryData(registrationKeys.list(eventId), context.previousRegistrations);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: registrationKeys.list(eventId),
      });
    },
  });
}

export function useDeleteRegistration(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRegistration,
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: registrationKeys.list(eventId),
      });

      const previousRegistrations = queryClient.getQueryData<{
        registrations: RegistrationWithAttendeeDto[];
      }>(registrationKeys.list(eventId));

      if (previousRegistrations) {
        queryClient.setQueryData(registrationKeys.list(eventId), {
          registrations: previousRegistrations.registrations.filter((r) => r.id !== id),
        });
      }

      return { previousRegistrations };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRegistrations) {
        queryClient.setQueryData(registrationKeys.list(eventId), context.previousRegistrations);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: registrationKeys.list(eventId),
      });
    },
  });
}
