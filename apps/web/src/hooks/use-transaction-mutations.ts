import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTransaction, recordSale, updateTransaction } from '@/lib/apis';

export const useTransactionMutations = (
  itemId: string,
  { onTransactionUpdated, onSaleRecorded }: { onTransactionUpdated: () => void; onSaleRecorded: () => void },
) => {
  const queryClient = useQueryClient();

  const refreshAfterMutation = async (successMessage: string) => {
    try {
      await queryClient.cancelQueries({ queryKey: ['history'] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['itemTransactions', itemId] }, { throwOnError: true }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }, { throwOnError: true }),
        queryClient.invalidateQueries({ queryKey: ['valuation'] }, { throwOnError: true }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ]);
    } catch {
      alert(`${successMessage}, but could not refresh. Reload the page.`);
    }
  };

  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, body }: { transactionId: string; body: Parameters<typeof updateTransaction>[2] }) =>
      updateTransaction(itemId, transactionId, body),
    onSuccess: () => {
      onTransactionUpdated();
      return refreshAfterMutation('Transaction saved');
    },
  });

  const saleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof recordSale>[1]) => recordSale(itemId, payload),
    onSuccess: () => {
      onSaleRecorded();
      return refreshAfterMutation('Sale saved');
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: ({ transactionId }: { transactionId: string }) => deleteTransaction(itemId, transactionId),
    onSuccess: () => refreshAfterMutation('Transaction deleted'),
  });

  return { updateTransactionMutation, saleMutation, deleteTransactionMutation };
};
