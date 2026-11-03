// src/conference-management/Notification/index.js
// Composition root for Notification sub-domain within Conference Management

import { UnitOfWork } from "../../../shared/infrastructure/UnitOfWork.js";
import { PostgresNotificationRepository } from "./infrastructure/repositories/PostgresNotificationRepository.js";
import { PostgresOutboxRepository } from "./infrastructure/repositories/PostgresOutboxRepository.js";
import { EmailGateway } from "./infrastructure/gateways/EmailGateway.js";
import { SmsGateway } from "./infrastructure/gateways/SmsGateway.js";
import { PushNotificationGateway } from "./infrastructure/gateways/PushNotificationGateway.js";
import { NotificationDispatcher } from "./infrastructure/services/NotificationDispatcher.js";
import { NotificationOutboxWorker } from "./infrastructure/workers/NotificationOutboxWorker.js";

import { SendNotificationUseCase } from "./application/use-cases/SendNotificationUseCase.js";
import { GetNotificationUseCase } from "./application/use-cases/GetNotificationUseCase.js";
import { ListNotificationUseCase } from "./application/use-cases/ListNotificationUseCase.js";

import { PaymentReleasedHandler } from "./application/event-handlers/PaymentReleasedHandler.js";
import { NotificationController, createNotificationRouter } from "./api/index.js";

export function createConferenceNotificationSubModule({
  db,
  logger,
  config,
  eventBus
}) {
  // 1. FAIL FAST
  if (!db) throw new Error("ConferenceNotificationSubModule: 'db' is required.");
  if (!logger) throw new Error("ConferenceNotificationSubModule: 'logger' is required.");
  if (!eventBus) throw new Error("ConferenceNotificationSubModule: 'eventBus' is required.");

  const sendgridKey = config?.sendgrid?.apiKey;
  if (!sendgridKey) {
    logger.warn("ConferenceNotificationSubModule: SendGrid API key missing. Email delivery disabled.");
  }

  // 2. Transaction Scope
  const uow = new UnitOfWork(db);

  // 3. Repositories
  const notificationRepository = new PostgresNotificationRepository({ uow });
  const outboxRepository = new PostgresOutboxRepository({ uow });

  // 4. Gateways & Dispatcher
  const emailGateway = new EmailGateway({ apiKey: sendgridKey, logger });
  const smsGateway = new SmsGateway({ apiKey: config?.twilio?.apiKey, logger });
  const pushGateway = new PushNotificationGateway({ firebase: config?.firebase, logger });

  const dispatcher = new NotificationDispatcher({
    emailGateway,
    smsGateway,
    pushGateway,
    logger
  });

  // 5. Application Use Cases
  const sendNotificationUseCase = new SendNotificationUseCase({
    notificationRepository,
    outboxRepository,
    uow,
    logger
  });

  const getNotificationUseCase = new GetNotificationUseCase({ notificationRepository });
  const listNotificationUseCase = new ListNotificationUseCase({ notificationRepository });

  // 6. Asynchronous Delivery Worker
  const outboxWorker = new NotificationOutboxWorker({
    outboxRepository,
    dispatcher,
    logger
  });

  // 7. Domain Event Handlers
  const paymentReleasedHandler = new PaymentReleasedHandler({
    sendNotificationUseCase,
    logger
  });

  // 8. Presentation Layer
  const notificationController = new NotificationController({
    sendNotificationUseCase,
    getNotificationUseCase,
    listNotificationUseCase,
    logger
  });

  const router = createNotificationRouter({ notificationController });

  let subscriptionToken = null;

  return {
    router,

    subscribe: () => {
      subscriptionToken = eventBus.subscribe('payment.released', async (event) => {
        try {
          await paymentReleasedHandler.handle(event);
        } catch (err) {
          logger.error({ err, eventId: event.id }, "Failed handling payment.released event");
        }
      });
    },

    start: async () => {
      logger.info("Starting Conference Notification Sub-Module Outbox Worker...");
      await outboxWorker.start();
    },

    close: async () => {
      logger.info("Closing Conference Notification Sub-Module...");
      if (subscriptionToken && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe('payment.released', subscriptionToken);
      }
      await outboxWorker.stop();
    }
  };
}