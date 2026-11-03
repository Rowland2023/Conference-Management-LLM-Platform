
import Joi from "joi";

/**
 * Shared event scheduling validators.
 */
const startTime = Joi.date()
    .iso()
    .greater("now")
    .required();

const endTime = Joi.date()
    .iso()
    .greater(Joi.ref("startTime"))
    .required();

/**
 * Create Event
 *
 * organizerId is deliberately excluded.
 * It must come from the authenticated user.
 */
export const createEventSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .required(),

    roomId: Joi.string()
        .uuid()
        .required(),

    startTime,

    endTime,
});

/**
 * Event identifier
 */
export const eventIdSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required(),
});

/**
 * Event query parameters
 */
export const eventQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),
});

/**
 * Event rescheduling
 */
export const rescheduleEventSchema = Joi.object({
    startTime,

    endTime,
});
