// src/conference-management/accounting-services/ledger/index.js

import { Router }
    from "express";

import { LedgerService }
    from "./application/services/LedgerService.js";

import { CreateAccountUseCase }
    from "./application/use-case/create-account.usecase.js";

import { CreateHoldUseCase }
    from "./application/use-case/create-hold.usecase.js";

import { GetLedgerBalanceUseCase }
    from "./application/use-case/get-ledger-balance.usecase.js";

import { PostJournalEntryUseCase }
    from "./application/use-case/post-journal-entry.usecase.js";

import { ReverseJournalEntryUseCase }
    from "./application/use-case/reverse-journal-entry.usecase.js";
    
import { PostgresAccountRepository }
    from "./infrastructure/repositories/postgres-account.repository.js";

import { PostgresJournalEntryRepository }
    from "./infrastructure/repositories/postgres-journal-entry.repository.js";

import { PostgresHoldRepository }
    from "./infrastructure/repositories/postgres-hold.repository.js";

import AccountController
    from "./presentation/controller/account.controller.js";

import JournalController
    from "./presentation/controller/journal.controller.js";

import HoldController
    from "./presentation/controller/hold.controller.js";

import createAccountRoutes
    from "./presentation/router/account.routes.js";

import createJournalRoutes
    from "./presentation/router/journal.routes.js";

import createHoldRoutes
    from "./presentation/router/hold.routes.js";


export function createLedgerModule({

    unitOfWorkFactory,

    outboxRepository,

    logger,

}) {

    //--------------------------------------------------
    // Unit Of Work
    //--------------------------------------------------

    const uow =
        unitOfWorkFactory();


    //--------------------------------------------------
    // Repositories
    //--------------------------------------------------

    const accountRepository =
        new PostgresAccountRepository({

            uow,

        });


    const journalRepository =
        new PostgresJournalEntryRepository({

            uow,

        });


    const holdRepository =
        new PostgresHoldRepository({

            uow,

        });


    //--------------------------------------------------
    // Use Cases
    //--------------------------------------------------

    const createAccountUseCase =
        new CreateAccountUseCase({

            accountRepository,

            outboxRepository,

            uow,

            logger,

        });


    const postJournalEntryUseCase =
        new PostJournalEntryUseCase({

            journalRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger,

        });


    const reverseJournalEntryUseCase =
        new ReverseJournalEntryUseCase({

            journalRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger,

        });


    const getLedgerBalanceUseCase =
        new GetLedgerBalanceUseCase({

            accountRepository,

            logger,

        });


    const createHoldUseCase =
        new CreateHoldUseCase({

            holdRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger,

        });


    //--------------------------------------------------
    // Application Service
    //--------------------------------------------------

    const ledgerService =
        new LedgerService({

            createAccountUseCase,

            createHoldUseCase,

            getLedgerBalanceUseCase,

            postJournalEntryUseCase,

            reverseJournalEntryUseCase,

        });


    //--------------------------------------------------
    // Controllers
    //--------------------------------------------------

    const accountController =
        new AccountController({

            ledgerService,

        });


    const journalController =
        new JournalController({

            ledgerService,

        });


    const holdController =
        new HoldController({

            ledgerService,

        });


    //--------------------------------------------------
    // Router
    //--------------------------------------------------

    const router =
        Router();


    router.use(

        "/accounts",

        createAccountRoutes(

            accountController

        )

    );


    router.use(

        "/journals",

        createJournalRoutes(

            journalController

        )

    );


    router.use(

        "/holds",

        createHoldRoutes(

            holdController

        )

    );


    //--------------------------------------------------
    // Public API
    //--------------------------------------------------

    return {

        name: "ledger",

        router,

        service:
            ledgerService,

        controllers: {

            accountController,

            journalController,

            holdController,

        },

        repositories: {

            accountRepository,

            journalRepository,

            holdRepository,

        },

        useCases: {

            createAccountUseCase,

            createHoldUseCase,

            getLedgerBalanceUseCase,

            postJournalEntryUseCase,

            reverseJournalEntryUseCase,

        },

    };

}