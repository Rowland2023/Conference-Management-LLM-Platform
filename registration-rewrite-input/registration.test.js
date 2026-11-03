
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createTestAuthHeaders } from "../helpers/auth.js";

describe("Registration API Integration Tests", () => {
    let app;
    let server;

    beforeAll(async () => {
        const application = await createApp();

        app = application.app;

        if (!app) {
            throw new Error("createApp() did not return an Express app.");
        }

        if (application.server) {
            server = application.server;
        }
    });

    afterAll(async () => {
        if (server && typeof server.close === "function") {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }
    });

    test("POST /registrations creates a registration", async () => {
        const response = await request(app)
            .post("/registrations")
            .set(createTestAuthHeaders())
            .send({
                eventId: "550e8400-e29b-41d4-a716-446655440000",
                ticketType: "standard",
            });

        // Diagnostic output to identify the cause of a failed request.
        console.log("Registration status:", response.status);
        console.log(
            "Registration content type:",
            response.headers["content-type"]
        );
        console.log("Registration response text:", response.text);
        console.log(
            "Registration response body:",
            JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(201);
        expect(response.body).toBeDefined();
    });
});

