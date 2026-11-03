// modules/registration/validators/registration.schema.js

import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format.');

const ticketTypes = [
  'standard',
  'vip',
  'student',
  'speaker',
  'sponsor',
];

const registrationStatuses = [
  'pending',
  'confirmed',
  'cancelled',
  'checked_in',
];

/**
 * POST /registrations
 */
export const createRegistrationSchema = z.object({
  body: z.object({
    eventId: uuidSchema,

    ticketType: z.enum(ticketTypes),

    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters.')
      .optional(),

    dietaryRequirements: z
      .string()
      .trim()
      .max(255, 'Dietary requirements cannot exceed 255 characters.')
      .optional(),

    specialAssistance: z
      .string()
      .trim()
      .max(255, 'Special assistance cannot exceed 255 characters.')
      .optional(),
  }),
});

/**
 * PATCH /registrations/:id
 */
export const updateRegistrationSchema = z.object({
  body: z.object({
    ticketType: z.enum(ticketTypes).optional(),

    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters.')
      .optional(),

    dietaryRequirements: z
      .string()
      .trim()
      .max(255, 'Dietary requirements cannot exceed 255 characters.')
      .optional(),

    specialAssistance: z
      .string()
      .trim()
      .max(255, 'Special assistance cannot exceed 255 characters.')
      .optional(),
  }),
});

/**
 * Route parameter validation
 */
export const registrationIdSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * GET /registrations
 */
export const registrationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    eventId: uuidSchema.optional(),

    attendeeId: uuidSchema.optional(),

    status: z.enum(registrationStatuses).optional(),
  }),
});

/**
 * POST /registrations/:id/check-in
 */
export const checkInRegistrationSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * DELETE /registrations/:id
 */
export const cancelRegistrationSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

/**
 * GET /registrations/me
 * No validation required because the authenticated
 * user's ID comes from req.user after auth middleware.
 */
export const myRegistrationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: z.enum(registrationStatuses).optional(),
  }),
});