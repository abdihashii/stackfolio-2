import type { SubmitHandler } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { BuyFormInput, BuyFormValues } from '@/types/form.schema';

import { recordBuy } from '@/lib/apis';
import { buySchema } from '@/types/form.schema';

export const usePurchaseItem = (inventoryIsPending: boolean, setPage: React.Dispatch<React.SetStateAction<number>>) => {
  const queryClient = useQueryClient();

  const form = useForm<BuyFormInput, undefined, BuyFormValues>({
    resolver: zodResolver(buySchema),
    defaultValues: { quantity: 1, acquisition_date: null },
  });

  const purchaseItemMutation = useMutation({
    mutationFn: recordBuy,
    onSuccess: async () => {
      form.reset();
      try {
        await queryClient.cancelQueries({ queryKey: ['history'] });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['inventory'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['valuation'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['itemTransactions'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['history'] }),
        ]);
      } catch {
        alert('Buy saved, but could not refresh. Reload the page.');
      }
      setPage(1);
    },
  });

  const onCreateItem: SubmitHandler<BuyFormValues> = async (data) => {
    if (purchaseItemMutation.isPending || inventoryIsPending) return;
    try {
      await purchaseItemMutation.mutateAsync(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create item.');
    }
  };

  return {
    form,
    purchaseItemMutation,
    onCreateItem,
  };
};
