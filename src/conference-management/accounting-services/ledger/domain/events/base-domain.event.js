// src/shared/domain/events/base-domain.event.js

import { randomUUID } from "node:crypto";
import { InvalidArgumentError } from "../error/index.js";


export class BaseDomainEvent {

    constructor({
        eventId,
        eventName,
        aggregateId,
        payload = {},
        version = 1,
        occurredAt = new Date(),
        metadata = {},
    }) {

        if (!eventName || typeof eventName !== "string") {
            throw new InvalidArgumentError(
                "eventName is required"
            );
        }


        if (!aggregateId || typeof aggregateId !== "string") {
            throw new InvalidArgumentError(
                "aggregateId is required"
            );
        }


        if (!Number.isInteger(version) || version < 1) {
            throw new InvalidArgumentError(
                "version must be a positive integer"
            );
        }


        this._eventId = eventId || randomUUID();

        this._eventName = eventName;

        this._aggregateId = aggregateId;

        this._version = version;

        this._occurredAt =
            occurredAt instanceof Date
                ? occurredAt
                : new Date(occurredAt);


        if (Number.isNaN(this._occurredAt.getTime())) {
            throw new InvalidArgumentError(
                "occurredAt must be a valid date"
            );
        }


        this._payload = Object.freeze({
            ...payload
        });


        this._metadata = Object.freeze({
            ...metadata
        });


        Object.freeze(this);
    }


    get eventId() {
        return this._eventId;
    }


    get eventName() {
        return this._eventName;
    }


    get aggregateId() {
        return this._aggregateId;
    }


    get version() {
        return this._version;
    }


    get occurredAt() {
        return this._occurredAt;
    }


    get payload() {
        return this._payload;
    }


    get metadata() {
        return this._metadata;
    }


    toJSON() {

        return {
            eventId: this._eventId,

            eventName: this._eventName,

            aggregateId: this._aggregateId,

            version: this._version,

            occurredAt: this._occurredAt.toISOString(),

            payload: {
                ...this._payload
            },

            metadata: {
                ...this._metadata
            }
        };
    }
}