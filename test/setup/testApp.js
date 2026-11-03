import { createApp } from "../../src/app.js";

let application;

export async function getApplication() {

    if (!application) {

        application = await createApp();

        await application.start?.();

    }

    return application;
}

export async function stopApplication() {

    if (application) {

        await application.stop?.();

        application = null;

    }
}