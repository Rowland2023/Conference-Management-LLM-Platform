import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Health Endpoint", () => {

    let application;
    let app;

    beforeAll(async () => {
        application = await createApp();
        app = application.app;
    });

    afterAll(async () => {
        await application?.stop?.();
    });

    test("GET /health returns 200", async () => {

        const response = await request(app)
            .get("/health");

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                status: "ok"
            })
        );

    });

});