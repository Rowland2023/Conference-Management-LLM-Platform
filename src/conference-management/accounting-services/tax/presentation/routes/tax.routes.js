// tax/presentation/routes/tax.routes.js

import { Router }
    from "express";

import { validate }
    from "../../../../../shared/infrastructure/middleware/validate.js";

import { calculateTaxSchema }
    from "../validators/CalculateTaxValidator.js";

import { recordTaxSchema }
    from "../validators/RecordTaxValidator.js";

import { payTaxSchema }
    from "../validators/PayTaxValidator.js";

import { taxIdSchema }
    from "../validators/TaxIdValidator.js";


export function createTaxRouter({

    taxController,

}) {

    const router =
        Router();


    //--------------------------------------------------
    // Commands
    //--------------------------------------------------

    router.post(

        "/",

        validate(
            calculateTaxSchema
        ),

        taxController.calculate.bind(
            taxController
        ),

    );


    router.post(

        "/:taxId/record",

        validate(
            taxIdSchema,
            "params",
        ),

        validate(
            recordTaxSchema
        ),

        taxController.record.bind(
            taxController
        ),

    );


    router.post(

        "/:taxId/pay",

        validate(
            taxIdSchema,
            "params",
        ),

        validate(
            payTaxSchema
        ),

        taxController.pay.bind(
            taxController
        ),

    );


    //--------------------------------------------------
    // Queries
    //--------------------------------------------------

    router.get(

        "/:taxId",

        validate(
            taxIdSchema,
            "params",
        ),

        taxController.get.bind(
            taxController
        ),

    );


    router.get(

        "/",

        taxController.list.bind(
            taxController
        ),

    );


    return router;

}