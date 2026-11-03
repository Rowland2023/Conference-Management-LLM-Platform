import { BaseController }
    from "../../../shared/presentation/BaseController.js";


export class SettlementController
    extends BaseController {

    constructor({

        createSettlementUseCase,

        scheduleSettlementUseCase,

        completeSettlementUseCase,

        cancelSettlementUseCase,

        getSettlementUseCase,

        listSettlementsUseCase,

    }) {

        super();

        this.createSettlementUseCase =
            createSettlementUseCase;

        this.scheduleSettlementUseCase =
            scheduleSettlementUseCase;

        this.completeSettlementUseCase =
            completeSettlementUseCase;

        this.cancelSettlementUseCase =
            cancelSettlementUseCase;

        this.getSettlementUseCase =
            getSettlementUseCase;

        this.listSettlementsUseCase =
            listSettlementsUseCase;

    }

    create(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.createSettlementUseCase.execute(

                req.command,

            ),

            201,

        );

    }

    schedule(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.scheduleSettlementUseCase.execute(

                req.command,

            ),

        );

    }

    complete(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.completeSettlementUseCase.execute(

                req.command,

            ),

        );

    }

    cancel(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.cancelSettlementUseCase.execute(

                req.command,

            ),

        );

    }

    getById(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.getSettlementUseCase.execute(

                req.queryObject,

            ),

        );

    }

    list(req, res, next) {

        return this.execute(

            res,

            next,

            () => this.listSettlementsUseCase.execute(

                req.queryObject,

            ),

        );

    }

}