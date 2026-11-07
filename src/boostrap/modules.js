
import { createConferenceEventScheduleSubModule } from "../conference-management/event-schedule/index.js";
import { createConferenceRegistrationSubModule } from "../conference-management/Registration/index.js";
import { createAccountingServicesModule } from "../conference-management/accounting-services/index.js";
import { createTicketModule } from "../conference-management/Ticket/index.js";
import { createAuthenticationModule } from "../conference-management/authentication/index.js";
import { authenticate as createAuthenticateMiddleware } from "../conference-management/authentication/presentation/middleware/authenticate.js";
import { JwtTokenIssuer } from "../conference-management/authentication/infrastructure/jwt/JwtIssuer.js";

export function boostrapModules(shared) {
    const authenticationModule = createAuthenticationModule(shared);

    // Reuse the same JWT configuration as the authentication module.
    const tokenIssuer = new JwtTokenIssuer({
        secret: shared.config.security.jwt.secret,
        issuer: shared.config.security.jwt.issuer,
        audience: shared.config.security.jwt.audience,
    });

    const authenticateMiddleware = createAuthenticateMiddleware({
        tokenVerifier: tokenIssuer,
        logger: shared.logger,
    });

    const eventScheduleModule =
    createConferenceEventScheduleSubModule({
        ...shared,
        authenticateMiddleware,
    });

    const registrationModule = createConferenceRegistrationSubModule({
        ...shared,
        authenticateMiddleware,
    });

    const accountingModule = createAccountingServicesModule(shared);

    const ticketModule = createTicketModule({
        ...shared,
        authenticateMiddleware,
    });

    const modules = [
        authenticationModule,
        eventScheduleModule,
        registrationModule,
        accountingModule,
        ticketModule,
    ];

    shared.logger?.info(
        {
            modules: [
                "authentication",
                "eventSchedule",
                "registration",
                "accounting",
                "ticket",
            ],
        },
        "Conference management modules initialized",
    );

    return modules;
}
