import type { SubmitHandler } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import type { FormValues } from '@/types/form.schema';

import { createHolding } from '@/lib/apis';
import { schema } from '@/types/form.schema';

export const useCreateHolding = (holdingsIsPending: boolean) => {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 1 } });

  const createHoldingMutation = useMutation({
    mutationFn: createHolding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['holdings'] });
      form.reset();
    },
  });

  const onCreateHolding: SubmitHandler<FormValues> = async (data) => {
    if (createHoldingMutation.isPending || holdingsIsPending) return;
    try {
      await createHoldingMutation.mutateAsync(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create holding.');
    }
  };

  return {
    form,
    createHoldingMutation,
    onCreateHolding,
  };
};
