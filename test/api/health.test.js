import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Health Endpoint", () => {

    let app;

    beforeAll(async () => {
        const application = await createApp();
        app = application.app;
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