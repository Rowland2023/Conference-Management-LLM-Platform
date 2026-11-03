/**
 * @file RegistrationMapper.js
 * @description Maps Registration domain entities to HTTP DTOs.
 */

export function toResponseDto(registration) {
  if (!registration) return null;

  return {
    id: registration.id,
    attendeeId: registration.attendeeId,
    conferenceId: registration.conferenceId,
    ticketId: registration.ticketId,
    ticketTier: registration.ticketTier,
    paymentId: registration.paymentId,

    status:
      typeof registration.status === "object"
        ? registration.status.value
        : registration.status,

    attendeeNotes: registration.attendeeNotes ?? null,

    checkedInAt: registration.checkedInAt
      ? registration.checkedInAt.toISOString()
      : null,

    cancelledAt: registration.cancelledAt
      ? registration.cancelledAt.toISOString()
      : null,

    createdAt: registration.createdAt
      ? registration.createdAt.toISOString()
      : null,

    updatedAt: registration.updatedAt
      ? registration.updatedAt.toISOString()
      : null,
  };
}

export function toResponseDtoList(registrations = []) {
  return registrations.map(toResponseDto);
}