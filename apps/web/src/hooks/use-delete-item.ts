import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteItem } from '@/lib/apis';

export const useDeleteItem = (isBusy: boolean) => {
  const queryClient = useQueryClient();

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['inventory'] }),
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
