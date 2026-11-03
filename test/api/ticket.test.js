
// test/api/ticket.test.js

import crypto from "node:crypto";
import request from "supertest";

import db from "../../src/cross-cutting/database/knex.js";
import { createApp } from "../../src/app.js";
import { createTestAuthHeaders } from "../helpers/auth.js";

describe("Ticket API Integration Tests", () => {
    let app;
    let application;
    let conferenceId;

    const BASE_URL = "/tickets";

    const makeTicketPayload = (overrides = {}) => ({
        conferenceId,
        type: "GENERAL_ADMISSION",
        price: 10000,
        currency: "NGN",
        capacity: 100,
        ...overrides,
    });

    const api = () => request(app);

    const authenticatedRequest = (req) =>
        req
            .set(createTestAuthHeaders())
            .set("Idempotency-Key", crypto.randomUUID());

    const expectSuccess = (response, expectedStatus) => {
        expect(response.statusCode).toBe(expectedStatus);

        if (response.statusCode !== expectedStatus) {
            throw new Error(
                [
                    `Expected HTTP ${expectedStatus}; received ${response.statusCode}.`,
                    `Response body: ${JSON.stringify(response.body)}`,
                    `Response text: ${response.text}`,
                ].join("\n")
            );
        }

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
    };

    const createTicket = async (overrides = {}) => {
        const response = await authenticatedRequest(
            api().post(BASE_URL)
        ).send(makeTicketPayload(overrides));

        expectSuccess(response, 201);
        expect(response.body.data.id).toBeTruthy();

        return response.body.data;
    };

    beforeAll(async () => {
        application = await createApp();
        app = application?.app;

        if (!app) {
            throw new Error(
                "createApp() did not return an application with an app property."
            );
        }

        conferenceId = crypto.randomUUID();

        await db("conferences").insert({
            id: conferenceId,
            title: "Ticket API integration test",
            registration_open: true,
            ticket_tier_capacities: {},
        });
    });

    afterAll(async () => {
        try {
            if (!conferenceId) return;

            const tickets = await db("tickets")
                .where({ conference_id: conferenceId })
                .select("id");

            const ticketIds = tickets.map(({ id }) => id);

            if (ticketIds.length > 0) {
                await db("outbox_events")
                    .whereIn("aggregate_id", ticketIds)
                    .del();
            }

            await db("tickets")
                .where({ conference_id: conferenceId })
                .del();

            await db("conferences")
                .where({ id: conferenceId })
                .del();
        } finally {
            if (typeof application?.stop === "function") {
                await application.stop();
            } else if (typeof application?.close === "function") {
                await application.close();
            }
        }
    });

    describe("POST /tickets", () => {
        test("creates a ticket with the expected monetary value", async () => {
            const ticket = await createTicket();

            expect(ticket).toMatchObject({
                conferenceId,
                type: "GENERAL_ADMISSION",
                price: {
                    amount: 10000,
                    currency: "NGN",
                },
                capacity: 100,
                reserved: 0,
                sold: 0,
                status: "ACTIVE",
            });

            expect(ticket.id).toBeTruthy();
        });
    });

    describe("GET /tickets/:id", () => {
        test("returns the requested ticket", async () => {
            const created = await createTicket({
                price: 25000,
            });

            const response = await authenticatedRequest(
                api().get(`${BASE_URL}/${created.id}`)
            );

            expectSuccess(response, 200);

            expect(response.body.data).toMatchObject({
                id: created.id,
                conferenceId,
                price: {
                    amount: 25000,
                    currency: "NGN",
                },
            });
        });
    });

    describe("POST /tickets/:id/reserve", () => {
        test("reserves the requested quantity", async () => {
            const created = await createTicket({
                price: 15000,
            });

            const response = await authenticatedRequest(
                api().post(`${BASE_URL}/${created.id}/reserve`)
            ).send({ quantity: 1 });

            expectSuccess(response, 200);

            expect(response.body.data).toMatchObject({
                id: created.id,
                status: "ACTIVE",
                reserved: 1,
                available: 99,
            });
        });
    });

    describe("POST /tickets/:id/cancel", () => {
        test("cancels the ticket inventory", async () => {
            const created = await createTicket({
                price: 15000,
            });

            const response = await authenticatedRequest(
                api().post(`${BASE_URL}/${created.id}/cancel`)
            ).send({
                reason: "Integration test cancellation",
            });

            expectSuccess(response, 200);

            expect(response.body.data).toMatchObject({
                id: created.id,
                status: "CANCELLED",
            });
        });
    });
});
