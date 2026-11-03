
/**
 * @file src/index.js
 *
 * Application Process Bootstrap
 *
 * Responsibilities:
 * - Create the application
 * - Start the application lifecycle
 * - Start the HTTP server
 * - Handle process signals and fatal errors
 *
 * Does NOT know:
 * - Database implementation details
 * - Kafka implementation details
 * - Repository implementations
 * - Feature-module wiring
 */

import "dotenv/config";

import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT = 15000;

let application = null;
let server = null;
let shuttingDown = false;
let startupCompleted = false;

const logger = {
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};

async function shutdown(signal, error) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    logger.warn(
        {
            signal,
            error,
        },
        "Graceful shutdown initiated"
    );

    const timeout = setTimeout(() => {
        logger.error("Shutdown timeout exceeded");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    timeout.unref?.();

    let shutdownFailed = false;

    try {
        // Stop accepting new connections and wait for
        // existing connections to finish.
        if (server?.listening) {
            await new Promise((resolve, reject) => {
                server.close((closeError) => {
                    if (closeError) {
                        reject(closeError);
                        return;
                    }

                    resolve();
                });

                // Close idle keep-alive connections where supported.
                server.closeIdleConnections?.();
            });
        }

        // Stop workers, event consumers, and infrastructure.
        if (application?.stop) {
            await application.stop();
        }
    } catch (shutdownError) {
        shutdownFailed = true;

        logger.error(
            {
                shutdownError,
            },
            "Application shutdown failed"
        );
    } finally {
        clearTimeout(timeout);
    }

    logger.info("Application shutdown completed");

    process.exit(
        error || shutdownFailed ? 1 : 0
    );
}

async function bootstrap() {
    // Install handlers before initializing application resources.
    process.once("SIGTERM", () => {
        void shutdown("SIGTERM");
    });

    process.once("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.once("uncaughtException", (error) => {
        void shutdown("uncaughtException", error);
    });

    process.once("unhandledRejection", (reason) => {
        const error = reason instanceof Error
            ? reason
            : new Error(String(reason));

        void shutdown("unhandledRejection", error);
    });

    try {
        application = await createApp({
            logger,
        });

        if (shuttingDown) {
            await application.stop?.();
            return;
        }

        const { app, start } = application;

        if (typeof app?.listen !== "function") {
            throw new TypeError(
                "createApp() must return an Express application"
            );
        }

        // Initialize infrastructure and background workers first.
        await start?.();

        if (shuttingDown) {
            await application.stop?.();
            return;
        }

        server = app.listen(PORT);

        server.once("listening", () => {
            startupCompleted = true;

            logger.info(
                {
                    port: PORT,
                },
                "Conference Management API started"
            );
        });

        server.on("error", (error) => {
            logger.error(
                {
                    error,
                },
                "HTTP server failure"
            );

            void shutdown("server_error", error);
        });
    } catch (error) {
        logger.error(
            {
                error,
            },
            "Fatal bootstrap failure"
        );

        if (application?.stop) {
            try {
                await application.stop();
            } catch (cleanupError) {
                logger.error(
                    {
                        cleanupError,
                    },
                    "Cleanup after bootstrap failure failed"
                );
            }
        }

        process.exit(1);
    }
}

void bootstrap();
