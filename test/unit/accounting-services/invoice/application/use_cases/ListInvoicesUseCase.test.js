import { jest } from '@jest/globals';

import {
    ListInvoicesUseCase,
} from "../../../../../../src/conference-management/accounting-services/invoice/application/use_case/listInvoicesUseCase.js";


describe(
    "ListInvoicesUseCase",
    () => {

        let invoiceRepository;
        let useCase;


        beforeEach(
            () => {

                invoiceRepository = {

                    findAll:
                        jest.fn(),

                };


                useCase =
                    new ListInvoicesUseCase({

                        invoiceRepository,

                    });

            }
        );


        // ==================================================
        // CONSTRUCTOR
        // ==================================================

        describe(
            "constructor",
            () => {

                it(
                    "should require invoiceRepository",
                    () => {

                        expect(
                            () =>
                                new ListInvoicesUseCase({})
                        ).toThrow(
                            "ListInvoicesUseCase: invoiceRepository is required."
                        );

                    }
                );

            }
        );


        // ==================================================
        // SUCCESS
        // ==================================================

        describe(
            "execute",
            () => {

                it(
                    "should return invoices from the repository",
                    async () => {

                        const result =
                            {

                                items: [

                                    {
                                        id:
                                            "invoice-1",

                                        invoiceNumber:
                                            "INV-2026-00001",

                                        status:
                                            "DRAFT",

                                    },

                                    {
                                        id:
                                            "invoice-2",

                                        invoiceNumber:
                                            "INV-2026-00002",

                                        status:
                                            "ISSUED",

                                    },

                                ],

                                total:
                                    2,

                                totalPages:
                                    1,

                            };


                        invoiceRepository.findAll
                            .mockResolvedValue(
                                result
                            );


                        const response =
                            await useCase.execute();


                        expect(
                            response
                        ).toEqual({

                            items:
                                result.items,

                            pagination: {

                                page:
                                    1,

                                limit:
                                    20,

                                total:
                                    2,

                                totalPages:
                                    1,

                            },

                        });

                    }
                );


                // ==========================================
                // FILTERS
                // ==========================================

                it(
                    "should pass filters to the repository",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 0,

                                totalPages: 0,

                            });


                        await useCase.execute({

                            status:
                                "ISSUED",

                            clientEmail:
                                "client@example.com",

                            currency:
                                "NGN",

                            search:
                                "Acme",

                        });


                        expect(
                            invoiceRepository.findAll
                        ).toHaveBeenCalledWith(

                            expect.objectContaining({

                                status:
                                    "ISSUED",

                                clientEmail:
                                    "client@example.com",

                                currency:
                                    "NGN",

                                search:
                                    "Acme",

                            }),

                            undefined

                        );

                    }
                );


                // ==========================================
                // PAGINATION
                // ==========================================

                it(
                    "should calculate the correct offset",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 100,

                                totalPages: 5,

                            });


                        await useCase.execute({

                            page:
                                3,

                            limit:
                                20,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).toHaveBeenCalledWith(

                            expect.objectContaining({

                                offset:
                                    40,

                                limit:
                                    20,

                            }),

                            undefined

                        );

                    }
                );


                it(
                    "should use the requested page and limit in the response",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 100,

                                totalPages: 5,

                            });


                        const response =
                            await useCase.execute({

                                page:
                                    3,

                                limit:
                                    20,

                            });


                        expect(
                            response.pagination
                        ).toEqual({

                            page:
                                3,

                            limit:
                                20,

                            total:
                                100,

                            totalPages:
                                5,

                        });

                    }
                );


                // ==========================================
                // SORTING
                // ==========================================

                it(
                    "should pass sort options to the repository",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 0,

                                totalPages: 0,

                            });


                        await useCase.execute({

                            sortBy:
                                "invoiceNumber",

                            sortOrder:
                                "asc",

                        });


                        expect(
                            invoiceRepository.findAll
                        ).toHaveBeenCalledWith(

                            expect.objectContaining({

                                sortBy:
                                    "invoiceNumber",

                                sortOrder:
                                    "asc",

                            }),

                            undefined

                        );

                    }
                );


                it(
                    "should normalize sort order to lowercase",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 0,

                                totalPages: 0,

                            });


                        await useCase.execute({

                            sortOrder:
                                "ASC",

                        });


                        expect(
                            invoiceRepository.findAll
                        ).toHaveBeenCalledWith(

                            expect.objectContaining({

                                sortOrder:
                                    "asc",

                            }),

                            undefined

                        );

                    }
                );


                // ==========================================
                // TRANSACTION
                // ==========================================

                it(
                    "should pass the transaction to the repository",
                    async () => {

                        const trx = {

                            id:
                                "transaction-123",

                        };


                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 0,

                                totalPages: 0,

                            });


                        await useCase.execute({

                            trx,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).toHaveBeenCalledWith(

                            expect.any(Object),

                            trx

                        );

                    }
                );


                // ==========================================
                // VALIDATION
                // ==========================================

                it(
                    "should reject a page less than 1",
                    async () => {

                        await expect(

                            useCase.execute({

                                page:
                                    0,

                            })

                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject a non-integer page",
                    async () => {

                        await expect(

                            useCase.execute({

                                page:
                                    1.5,

                            })

                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject a limit greater than 100",
                    async () => {

                        await expect(

                            useCase.execute({

                                limit:
                                    101,

                            })

                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject an invalid sort order",
                    async () => {

                        await expect(

                            useCase.execute({

                                sortOrder:
                                    "invalid",

                            })

                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findAll
                        ).not.toHaveBeenCalled();

                    }
                );


                // ==========================================
                // EMPTY RESULT
                // ==========================================

                it(
                    "should return an empty list when no invoices exist",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 0,

                                totalPages: 0,

                            });


                        const response =
                            await useCase.execute();


                        expect(
                            response.items
                        ).toEqual([]);


                        expect(
                            response.pagination.total
                        ).toBe(0);

                    }
                );


                // ==========================================
                // TOTAL PAGES FALLBACK
                // ==========================================

                it(
                    "should calculate totalPages when repository does not provide it",
                    async () => {

                        invoiceRepository.findAll
                            .mockResolvedValue({

                                items: [],

                                total: 45,

                            });


                        const response =
                            await useCase.execute({

                                page:
                                    1,

                                limit:
                                    20,

                            });


                        expect(
                            response.pagination.totalPages
                        ).toBe(3);

                    }
                );

            }
        );

    }
);

