import { Router }
    from "express";

import { validate }
    from "../../../../../shared/infrastructure/middleware/validate.js";

import { serialize }
    from "../../../shared/presentation/middleware/serialize.js";

import {
    CreateSettlementSerializer,
}
    from "../serializers/CreateSettlementSerializer.js";

import {
    ScheduleSettlementSerializer,
}
    from "../serializers/ScheduleSettlementSerializer.js";

import {
    GetSettlementSerializer,
}
    from "../serializers/GetSettlementSerializer.js";

import {
    ListSettlementsSerializer,
}
    from "../serializers/ListSettlementsSerializer.js";

import {
    CreateSettlementValidator,
}
    from "../validators/CreateSettlementValidator.js";

import {
    ScheduleSettlementValidator,
}
    from "../validators/ScheduleSettlementValidator.js";


export function createSettlementRoutes({

    controller,

}) {

    const router =
        Router();


    //--------------------------------------------------
    // Commands
    //--------------------------------------------------

    router.post(

        "/",

        validate(CreateSettlementValidator),

        serialize(CreateSettlementSerializer),

        controller.create.bind(controller),

    );


    router.post(

        "/:settlementId/schedule",

        validate(ScheduleSettlementValidator),

        serialize(ScheduleSettlementSerializer),

        controller.schedule.bind(controller),

    );


    router.post(

        "/:settlementId/complete",

        controller.complete.bind(controller),

    );


    router.post(

        "/:settlementId/cancel",

        controller.cancel.bind(controller),

    );


    //--------------------------------------------------
    // Queries
    //--------------------------------------------------

    router.get(

        "/:settlementId",

        serialize(GetSettlementSerializer),

        controller.getById.bind(controller),

    );


    router.get(

        "/",

        serialize(ListSettlementsSerializer),

        controller.list.bind(controller),

    );


    return router;

}