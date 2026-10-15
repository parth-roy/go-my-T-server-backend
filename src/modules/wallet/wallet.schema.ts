import { z } from 'zod';

export const addMoneySchema = z.object({
    amount: z.number().min(1, 'Amount must be greater than 0'),
    referenceId: z.string().optional(),
    targetUserId: z.string().uuid().optional(),
});

export type AddMoneyInput = z.infer<typeof addMoneySchema>;
