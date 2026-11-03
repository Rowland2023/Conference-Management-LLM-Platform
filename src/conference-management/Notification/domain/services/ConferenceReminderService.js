import { ValidationError }
from "../../../../shared/application/errors/ApplicationErrors.js";

export class ConferenceReminderService {
    /**
     * Evaluates if a conference is eligible for a 24-hour reminder broadcast.
     * Guarded with a strict temporal window box to prevent premature or duplicate sends.
     * 
     * @param {Object} conference - The Conference aggregate/entity context.
     * @param {Date|string} [now=new Date()] - Evaluated baseline target time.
     * @returns {boolean} True only if inside the precise delivery window.
     */
    shouldSendReminder(conference, now = new Date()) {
        if (!conference || !conference.startTime) {
            throw new ValidationError("ConferenceReminderService: A valid conference entity with a startTime is required.");
        }

        // 1. Guard immediate domain business invariants
        if (conference.status === "cancelled" || conference.status === "completed") {
            return false;
        }

        const currentTime = now instanceof Date ? now : new Date(now);
        const conferenceStartTime = conference.startTime instanceof Date 
            ? conference.startTime 
            : new Date(conference.startTime);

        if (Number.isNaN(currentTime.getTime()) || Number.isNaN(conferenceStartTime.getTime())) {
            throw new ValidationError("ConferenceReminderService: Invalid timestamp objects evaluated inside window logic.");
        }

        // 2. Defensive Cap: Do not allow retroactive sending if the conference has already kicked off
        if (currentTime >= conferenceStartTime) {
            return false;
        }

        // 3. Strict Boundary Lock: Calculate target reminder window bracket (Exactly 24 hours prior)
        const msPerHour = 60 * 60 * 1000;
        const targetReminderTime = conferenceStartTime.getTime() - (24 * msPerHour);
        
        // Define an upper evaluation threshold (e.g., do not evaluate if current time is more than 26 hours out)
        // This ensures the cron worker only matches items precisely hitting their 24-hour bracket.
        const maximumLookaheadBoundary = targetReminderTime - (2 * msPerHour);

        // Current time must be past our lookahead boundary, but hasn't overshot the target window point
        return currentTime >= maximumLookaheadBoundary && currentTime <= conferenceStartTime.getTime();
    }

    /**
     * Builds an immutable structure map representation of the delivery payload context.
     * 
     * @param {Object} conference - Conference domain properties context map.
     * @param {Object} attendee - Attendee profile identifier target map.
     * @returns {Object} Structured notification field layout.
     */
    buildReminderMessage(conference, attendee) {
        if (!conference || !conference.title || !conference.startTime) {
            throw new ValidationError("ConferenceReminderService: Complete conference metadata details are missing.");
        }
        if (!attendee || !attendee.name) {
            throw new ValidationError("ConferenceReminderService: Attendee structural profile data is missing.");
        }

        const conferenceStartTime = conference.startTime instanceof Date 
            ? conference.startTime 
            : new Date(conference.startTime);

        // International standard normalization formatting using an explicit fallback locale string ('en-US')
        // to avoid variation anomalies across different infrastructure hosting environments.
        const formattedDate = conferenceStartTime.toLocaleString("en-US", {
            dateStyle: "long",
            timeStyle: "short"
        });

        return {
            subject: `Reminder: ${conference.title}`,
            title: conference.title,
            body: `Hello ${attendee.name},\n\nThis is a reminder that "${conference.title}" starts on ${formattedDate}.`,
            metadata: {
                conferenceId: conference.id || null,
                templateCode: "CONF_REMINDER_24H"
            }
        };
    }
}