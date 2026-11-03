import { toResponseDto } from "../mappers/RegistrationMapper.js";

export class RegistrationController {
    constructor({
        createRegistrationUseCase,
        getRegistrationUseCase,
        getAllRegistrationsUseCase,
        updateRegistrationUseCase,
        cancelRegistrationUseCase,
        checkInRegistrationUseCase,
        logger,
    }) {
        this.createRegistrationUseCase = createRegistrationUseCase;
        this.getRegistrationUseCase = getRegistrationUseCase;
        this.getAllRegistrationsUseCase = getAllRegistrationsUseCase;
        this.updateRegistrationUseCase = updateRegistrationUseCase;
        this.cancelRegistrationUseCase = cancelRegistrationUseCase;
        this.checkInRegistrationUseCase = checkInRegistrationUseCase;
        this.logger = logger;
    }

    _getTracingContext(req) {
        return {
            correlationId:
                req.headers["x-correlation-id"] ??
                globalThis.crypto?.randomUUID?.() ??
                req.id,
            causationId: req.headers["x-request-id"] ?? null,
        };
    }

    createRegistration = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            this.logger?.debug?.(
                "Registration request received",
                {
                    body: req.body,
                    userId: req.user?.id,
                    ...tracingContext,
                }
            );

            const registration =
                await this.createRegistrationUseCase.execute(
                    {
                        attendeeId: req.user.id,
                        ...req.body,
                    },
                    req.user,
                    tracingContext,
                );

            this.logger?.debug?.(
                "Registration use case completed",
                {
                    registrationId: registration.id,
                    ...tracingContext,
                }
            );

            this.logger?.info?.(
                "Registration created successfully",
                {
                    registrationId: registration.id,
                    userId: req.user.id,
                    ...tracingContext,
                }
            );

            return res
                .status(201)
                .json(toResponseDto(registration));

        } catch (error) {

            this.logger?.error?.(
                "Registration creation failed",
                {
                    error,
                    body: req.body,
                    userId: req.user?.id,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };

    getRegistrationById = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            const registration =
                await this.getRegistrationUseCase.execute({
                    id: req.params.id,
                    currentUser: req.user,
                });

            return res
                .status(200)
                .json(toResponseDto(registration));

        } catch (error) {

            this.logger?.error?.(
                "Failed to retrieve registration",
                {
                    error,
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };

    getAllRegistrations = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            const {
                page = 1,
                limit = 20,
                ...filters
            } = req.query;

            const result =
                await this.getAllRegistrationsUseCase.execute({
                    page: Number(page),
                    limit: Math.min(Number(limit), 100),
                    filters,
                    currentUser: req.user,
                });

            return res.status(200).json({
                data: result.items.map(toResponseDto),
                meta: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                },
            });

        } catch (error) {

            this.logger?.error?.(
                "Failed to retrieve registrations",
                {
                    error,
                    query: req.query,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };

    updateRegistration = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            const registration =
                await this.updateRegistrationUseCase.execute(
                    {
                        id: req.params.id,
                        data: req.body,
                        currentUser: req.user,
                    },
                    tracingContext,
                );

            this.logger?.info?.(
                "Registration updated",
                {
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return res
                .status(200)
                .json(toResponseDto(registration));

        } catch (error) {

            this.logger?.error?.(
                "Registration update failed",
                {
                    error,
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };

    checkInRegistration = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            const registration =
                await this.checkInRegistrationUseCase.execute(
                    {
                        id: req.params.id,
                        currentUser: req.user,
                    },
                    tracingContext,
                );

            this.logger?.info?.(
                "Registration checked in",
                {
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return res
                .status(200)
                .json(toResponseDto(registration));

        } catch (error) {

            this.logger?.error?.(
                "Check-in failed",
                {
                    error,
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };

    cancelRegistration = async (req, res, next) => {
        const tracingContext = this._getTracingContext(req);

        try {
            await this.cancelRegistrationUseCase.execute(
                {
                    id: req.params.id,
                    currentUser: req.user,
                },
                tracingContext,
            );

            this.logger?.info?.(
                "Registration cancelled",
                {
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return res.sendStatus(204);

        } catch (error) {

            this.logger?.error?.(
                "Registration cancellation failed",
                {
                    error,
                    registrationId: req.params.id,
                    ...tracingContext,
                }
            );

            return next(error);
        }
    };
}