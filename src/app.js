
/**
 * src/app.js
 *
 * Application composition root.
 *
 * Responsibilities:
 * - Configure Express middleware and health checks
 * - Bootstrap shared infrastructure
 * - Compose feature modules
 * - Register HTTP routes
 * - Configure application lifecycle
 */

import express from "express";

import { bootstrapInfrastructure } from "./boostrap/infrastructure.js";
import { boostrapModules } from "./boostrap/modules.js";
import { bootstrapRoutes } from "./boostrap/routes.js";
import { bootstrapLifecycle } from "./boostrap/lifecycle.js";

import db from "./cross-cutting/database/knex.js";
import { config } from "./config/index.js";

import { PinoLogger } from "./cross-cutting/logging/PinoLogger.js";

const defaultLogger = new PinoLogger();

export async function createApp({
    logger = defaultLogger,
} = {}) {
    const app = express();

    // --------------------------------------------------
    // HTTP middleware
    // --------------------------------------------------

    app.use(
        express.json({
            limit: "1mb",
        })
    );

    // --------------------------------------------------
    // Health check
    // --------------------------------------------------

    app.get("/health", (req, res) => {
        res.status(200).json({
            status: "ok",
            service: "conference-management",
            timestamp: new Date().toISOString(),
        });
    });

    // --------------------------------------------------
    // 1. Bootstrap shared infrastructure
    // --------------------------------------------------

    const infrastructure = bootstrapInfrastructure({
        db,
        config,
        logger,
    });

    // --------------------------------------------------
    // 2. Compose shared dependencies
    // --------------------------------------------------

    const shared = {
        ...infrastructure,
    };

    // --------------------------------------------------
    // 3. Bootstrap feature modules
    // --------------------------------------------------

    const modules = await boostrapModules(shared);

    // --------------------------------------------------
    // 4. Register feature routes
    // --------------------------------------------------

    bootstrapRoutes({
        app,
        modules,
        logger: shared.logger ?? logger,
    });

    // --------------------------------------------------
    // 5. Configure application lifecycle
    // --------------------------------------------------

    const lifecycle = bootstrapLifecycle({
        modules,
        infrastructure: shared,
        logger: shared.logger ?? logger,
    });

    // --------------------------------------------------
    // 6. Expose application and lifecycle operations
    // --------------------------------------------------

    return {
        app,
        start: lifecycle.start,
        stop: lifecycle.stop,
    };
}
