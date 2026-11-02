import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteHolding } from '@/lib/apis';

export const useDeleteHolding = (isBusy: boolean) => {
  const queryClient = useQueryClient();

  const deleteHoldingMutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['holdings'] }),
  });

  const onDeleteHolding = async (id: string) => {
    if (isBusy) return;
    try {
      await deleteHoldingMutation.mutateAsync(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete holding.');
    }
  };

  return {
    deleteHoldingMutation,
    onDeleteHolding,
  };
};
