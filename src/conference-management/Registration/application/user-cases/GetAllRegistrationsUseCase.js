
import {
  UnauthorizedError,
  NotFoundError,
} from "../../../../shared/domain/error/DomainErrors.js";

export class GetAllRegistrationsUseCase {
  constructor({ registrationRepository, conferenceRepository }) {
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
  }

  async execute(input = {}, currentUser) {
    const filters = input.filters
      ? { ...input.filters, page: input.page, limit: input.limit }
      : input;

    currentUser = currentUser ?? input.currentUser;

    if (!currentUser) {
      throw new UnauthorizedError("Authentication is required.");
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(filters.limit) || 20)
    );

    let conferenceId = filters.conferenceId ?? filters.eventId;
    let userId = filters.userId ?? filters.attendeeId;

    const isAdmin =
      typeof currentUser.isAdmin === "function" &&
      currentUser.isAdmin();

    const isAttendee =
      typeof currentUser.isAttendee === "function" &&
      currentUser.isAttendee();

    const isOrganizer =
      typeof currentUser.isOrganizer === "function" &&
      currentUser.isOrganizer();

    if (!isAdmin) {
      if (isAttendee) {
        userId = currentUser.id;
      } else if (isOrganizer) {
        if (!conferenceId) {
          throw new UnauthorizedError(
            "Organizers must specify an eventId."
          );
        }

        const authorized =
          await this.conferenceRepository.isOrganizerOf(
            conferenceId,
            currentUser.id
          );

        if (!authorized) {
          throw new NotFoundError("Conference not found.");
        }
      } else {
        throw new UnauthorizedError("Unsupported user role.");
      }
    }

    const result = await this.registrationRepository.findAll({
      page,
      limit,
      conferenceId,
      userId,
      status: filters.status,
      ticketTier: filters.ticketTier ?? filters.ticketType,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    return {
      items: result.items,
      page,
      limit,
      total: result.totalItems,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / limit),
    };
  }
}
