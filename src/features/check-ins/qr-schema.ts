import { z } from "zod";
export const QR_PREFIX = "dojo-os:check-in:v1:";
export const qrTokenSchema = z.string().trim().max(100).transform((value) => value.startsWith(QR_PREFIX) ? value.slice(QR_PREFIX.length) : value)
  .pipe(z.string().regex(/^[0-9a-f]{64}$/));
export const qrIssuedSchema = z.object({ id: z.uuid(), token: z.string().regex(/^[0-9a-f]{64}$/), server_now: z.iso.datetime({ offset: true }), expires_at: z.iso.datetime({ offset: true }) });
export const qrPreviewSchema = z.object({ student_id: z.uuid(), student_name: z.string(), expires_at: z.string() });
export const qrStatusSchema = z.object({ consumed: z.boolean(), revoked: z.boolean(), expired: z.boolean() });
export type QrIssued = z.infer<typeof qrIssuedSchema>;
export type QrPreview = z.infer<typeof qrPreviewSchema>;
export type QrStatus = z.infer<typeof qrStatusSchema>;
