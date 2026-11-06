import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteItem } from '@/lib/apis';

export const useDeleteItem = (isBusy: boolean) => {
  const queryClient = useQueryClient();

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['valuation'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['itemTransactions'] }, { throwOnError: true }),
        ]);
      } catch {
        alert('Item deleted, but could not refresh. Reload the page.');
      }
    },
  });

  const onDeleteItem = async (id: string) => {
    if (isBusy) return;
    try {
      await deleteItemMutation.mutateAsync(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete item.');
    }
  };

  return {
    deleteItemMutation,
    onDeleteItem,
  };
};
