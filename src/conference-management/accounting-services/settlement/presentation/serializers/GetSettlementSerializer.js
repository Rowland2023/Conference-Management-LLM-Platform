// settlement/presentation/serializers/GetSettlementSerializer.js

import { GetSettlementQuery } from "../../application/queries/GetSettlementQuery.js";

export class GetSettlementSerializer {
    static serialize(req) {
        return new GetSettlementQuery({
            settlementId: req.params.settlementId,
        });
    }
}