import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { FormValues } from '@/types/form.schema';
import type { CreateHoldingInput } from '@/types/holdings.types';

import { updateHolding } from '@/lib/apis';
import { schema } from '@/types/form.schema';

export const useUpdateHolding = () => {
  const [updatingHoldingId, setUpdatingHoldingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const updateForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateHoldingInput }) => updateHolding(id, data),
    onSuccess: async () => {
      setUpdatingHoldingId(null);

      try {
        await queryClient.invalidateQueries({ queryKey: ['holdings'] }, { throwOnError: true });
      } catch {
        alert('Holding saved, but could not refresh. Reload the page.');
      }
    },
  });

  const onUpdateHolding = async (id: string, data: CreateHoldingInput) => {
    try {
      await updateHoldingMutation.mutateAsync({ id, data });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update holding.');
    }
  };

  return {
    updatingHoldingId,
    setUpdatingHoldingId,
    updateForm,
    updateHoldingMutation,
    onUpdateHolding,
  };
};
