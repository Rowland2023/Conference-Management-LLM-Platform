import { UnauthorizedError, NotFoundError } from '../../../../shared/domain/error/DomainErrors.js';

export class GetAllRegistrationsUseCase {
  constructor({ registrationRepository, conferenceRepository }) {
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
  }

  async execute(filters = {}, currentUser) {
    const {
      page = 1,
      limit = 20,
      conferenceId,
      userId,
      status,
      ticketTier,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    // 1. Authorization & Scoping
    let scopedUserId = userId;
    let scopedConferenceId = conferenceId;

    if (!currentUser.isAdmin()) {
      if (currentUser.isAttendee()) {
        scopedUserId = currentUser.id; // Force own data
        scopedConferenceId = undefined; // Attendees don't filter by conference
      } else if (currentUser.isOrganizer()) {
        if (!conferenceId) {
          throw new UnauthorizedError("Organizers must provide conferenceId filter.");
        }
        const isOwner = await this.conferenceRepository.isOrganizerOf(conferenceId, currentUser.id);
        if (!isOwner) {
          throw new NotFoundError("Conference not found."); // Blind-wall
        }
        scopedUserId = undefined; // Organizer sees all users in their conference
      } else {
        throw new UnauthorizedError("Unknown user role.");
      }
    }

    // 2. Input sanitization
    const sanitizedPage = Math.max(1, Math.floor(Number(page)) || 1);
    const sanitizedLimit = Math.min(Math.max(1, Math.floor(Number(limit)) || 20), 100);

    // 3. Whitelisting
    const ALLOWED_SORT_FIELDS = ['createdAt', 'status', 'updatedAt'];
    const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'WAITLISTED'];
    const ALLOWED_TICKET_TIERS = ['STANDARD', 'VIP', 'SPEAKER'];

    const finalSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const finalStatus = ALLOWED_STATUSES.includes(status) ? status : undefined;
    const finalTicketTier = ALLOWED_TICKET_TIERS.includes(ticketTier) ? ticketTier : undefined;

    // 4. Query
    const queryFilters = {
      page: sanitizedPage,
      limit: sanitizedLimit,
      conferenceId: scopedConferenceId,
      userId: scopedUserId,
      status: finalStatus,
      ticketTier: finalTicketTier,
      sortBy: finalSortBy,
      sortOrder: finalSortOrder
    };

    const result = await this.registrationRepository.findAll(queryFilters);

    return {
      items: result.items,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / sanitizedLimit)
    };
  }
}