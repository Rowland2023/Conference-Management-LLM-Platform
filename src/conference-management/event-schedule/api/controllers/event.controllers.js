
export class EventController {
    constructor({
        createEventUseCase,
        getEventByIdUseCase,
        listEventsUseCase,
        rescheduleEventUseCase,
        cancelEventUseCase,
        logger,
    }) {
        if (!logger) {
            throw new TypeError(
                "EventController requires a logger."
            );
        }

        this.createEventUseCase = createEventUseCase;
        this.getEventByIdUseCase = getEventByIdUseCase;
        this.listEventsUseCase = listEventsUseCase;
        this.rescheduleEventUseCase = rescheduleEventUseCase;
        this.cancelEventUseCase = cancelEventUseCase;

        this.logger = logger.child({
            context: "EventController",
        });

        this.createEvent = this.createEvent.bind(this);
        this.listEvents = this.listEvents.bind(this);
        this.getEventById = this.getEventById.bind(this);
        this.rescheduleEvent = this.rescheduleEvent.bind(this);
        this.cancelEvent = this.cancelEvent.bind(this);
    }

    /**
     * Serialize an Event aggregate into its public API representation.
     *
     * @param {Object} event
     * @returns {Object}
     */
    serializeEvent(event) {
        return {
            id: event.id,
            title: event.title,
            roomId: event.roomID,
            organizerId: event.organizerId,
            startTime: event.startTime,
            endTime: event.endTime,
            status: event.status,
            version: event.version,
        };
    }

    /**
     * Create a conference event.
     */
    async createEvent(req, res, next) {
        this.logger.info("HTTP request received: Create Event");

        try {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    message: "Authenticated organizer information is required.",
                });
            }

            const body = req.validated?.body ?? req.body;

            const result = await this.createEventUseCase.execute({
                ...body,
                organizerId: req.user.id,
                correlationId: req.correlationId,
            });

            this.logger.info("HTTP response generated: 201 Created", {
                eventId: result.eventId,
            });

            return res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * List conference events.
     */
    async listEvents(req, res, next) {
        this.logger.info("HTTP request received: List Events");

        try {
            const query = req.validated?.query ?? req.query;

            const result = await this.listEventsUseCase.execute(query);

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Retrieve a conference event by ID.
     */
    async getEventById(req, res, next) {
        const eventId = req.validated?.params?.id ?? req.params.id;

        this.logger.info("HTTP request received: Get Event By ID", {
            eventId,
        });

        try {
            const event = await this.getEventByIdUseCase.execute({
                eventId,
            });

            return res.status(200).json({
                success: true,
                data: this.serializeEvent(event),
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Reschedule a conference event.
     */
    async rescheduleEvent(req, res, next) {
        const eventId = req.params.id;

        this.logger.info("HTTP request received: Reschedule Event", {
            eventId,
        });

        try {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    message: "Authenticated user information is required.",
                });
            }

            const body = req.validated?.body ?? req.body;

            const result = await this.rescheduleEventUseCase.execute({
                eventId,
                startTime: body.startTime,
                endTime: body.endTime,
                rescheduledBy: req.user.id,
                correlationId: req.correlationId,
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Cancel a conference event.
     */
    async cancelEvent(req, res, next) {
        const eventId = req.params.id;

        this.logger.info("HTTP request received: Cancel Event", {
            eventId,
        });

        try {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    message: "Authenticated user information is required.",
                });
            }

            const result = await this.cancelEventUseCase.execute({
                eventId,
                cancelledBy: req.user.id,
                reason: req.body?.reason ?? null,
                correlationId: req.correlationId,
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            return next(error);
        }
    }
}
