import { z } from 'zod';
export const passMarkSchema = z.number().int().min(1).max(99);
export const borderlineSchema = z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]).refine(([low, high]) => low < high, 'The lower score must be below the upper score.');
export const videoLimitSchema = z.number().int().min(1).max(500);
export const durationSchema = z.number().int().min(30).max(600);
export const dailyCapSchema = z.number().int().min(1).max(50);
export function matchesTypedConfirm(expected: string, actual: string): boolean { return expected === actual; }
