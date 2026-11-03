/**
 * Account HTTP Controller
 *
 * Handles account lifecycle operations.
 */

export default class AccountController {

    constructor({

        ledgerService,

    }) {

        this.ledgerService =
            ledgerService;

    }


    /**
     * POST /accounts
     */
    createAccount = async (req, res, next) => {

        try {

            const command = {

                ...req.body,

                tenantId:
                    req.actor?.tenantId,

                createdBy:
                    req.actor?.id,

            };


            const result =
                await this.ledgerService.createAccount(
                    command
                );


            return res
                .status(201)
                .json(result);

        }

        catch (error) {

            next(error);

        }

    };


    /**
     * GET /accounts/:id/balance
     */
    getBalance = async (req, res, next) => {

        try {

            const query = {

                id:
                    req.params.id,

                tenantId:
                    req.actor?.tenantId,

            };


            const result =
                await this.ledgerService.getAccountBalance(
                    query
                );


            return res.json(result);

        }

        catch (error) {

            next(error);

        }

    };


    /**
     * GET /accounts
     */
    listAccounts = async (req, res, next) => {

        try {

            if (

                typeof this.ledgerService.listAccounts
                !== "function"

            ) {

                return res
                    .status(501)
                    .json({

                        success: false,

                        message:
                            "Account listing not implemented.",

                    });

            }


            const result =
                await this.ledgerService.listAccounts({

                    tenantId:
                        req.actor?.tenantId,

                });


            return res.json(result);

        }

        catch (error) {

            next(error);

        }

    };

}