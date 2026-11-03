import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { FormValues } from '@/types/form.schema';
import type { Item } from '@/types/inventory.types';
import type { CreateItemInput } from '@/types/inventory.types';

import { updateItem } from '@/lib/apis';
import { schema } from '@/types/form.schema';

export const useUpdateItem = () => {
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const updateForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateItemInput }) => updateItem(id, data),
    onSuccess: async () => {
      setUpdatingItemId(null);

      try {
        await queryClient.invalidateQueries({ queryKey: ['inventory'] }, { throwOnError: true });
      } catch {
        alert('Item saved, but could not refresh. Reload the page.');
      }
    },
  });

  const onUpdateItem = async (id: string, data: CreateItemInput) => {
    try {
      await updateItemMutation.mutateAsync({ id, data });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update item.');
    }
  };

  const onStartUpdate = (item: Item) => {
    const { id, metal, weight_unit, weight, purity, quantity, item_type, acquisition_date } = item;
    updateForm.reset({
      metal,
      weight_unit,
      weight,
      purity,
      quantity,
      item_type,
      acquisition_date,
    });
    setUpdatingItemId(id);
  };

  return {
    updatingItemId,
    setUpdatingItemId,
    updateForm,
    updateItemMutation,
    onUpdateItem,
    onStartUpdate,
  };
};
