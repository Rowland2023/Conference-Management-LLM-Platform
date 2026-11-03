import { jest } from '@jest/globals';
import {
    GetInvoiceUseCase,
    InvoiceNotFoundError,
} from "../../../../../../src/conference-management/accounting-services/invoice/application/use_case/getInvoiceUseCase.js";

describe(
    "GetInvoiceUseCase",
    () => {

        let invoiceRepository;
        let useCase;


        beforeEach(() => {

            invoiceRepository = {

                findById:
                    jest.fn(),

            };


            useCase =
                new GetInvoiceUseCase({

                    invoiceRepository,

                });

        });


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
                                new GetInvoiceUseCase({})
                        ).toThrow(
                            "GetInvoiceUseCase: invoiceRepository is required."
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
                    "should return an invoice when it exists",
                    async () => {

                        const invoice = {

                            id:
                                "invoice-123",

                            invoiceNumber:
                                "INV-2026-00001",

                            clientName:
                                "Acme Ltd",

                            status:
                                "DRAFT",

                        };


                        invoiceRepository.findById
                            .mockResolvedValue(
                                invoice
                            );


                        const result =
                            await useCase.execute({

                                invoiceId:
                                    "invoice-123",

                            });


                        expect(
                            result
                        ).toBe(invoice);


                        expect(
                            invoiceRepository.findById
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            invoiceRepository.findById
                        ).toHaveBeenCalledWith(
                            "invoice-123",
                            undefined
                        );

                    }
                );


                it(
                    "should trim the invoice ID before querying the repository",
                    async () => {

                        const invoice = {

                            id:
                                "invoice-123",

                        };


                        invoiceRepository.findById
                            .mockResolvedValue(
                                invoice
                            );


                        await useCase.execute({

                            invoiceId:
                                "  invoice-123  ",

                        });


                        expect(
                            invoiceRepository.findById
                        ).toHaveBeenCalledWith(
                            "invoice-123",
                            undefined
                        );

                    }
                );


                // ==========================================
                // NOT FOUND
                // ==========================================

                it(
                    "should throw InvoiceNotFoundError when invoice does not exist",
                    async () => {

                        invoiceRepository.findById
                            .mockResolvedValue(
                                null
                            );


                        await expect(
                            useCase.execute({

                                invoiceId:
                                    "invoice-999",

                            })
                        ).rejects.toBeInstanceOf(
                            InvoiceNotFoundError
                        );

                    }
                );


                it(
                    "should include the invoice ID in the not-found error",
                    async () => {

                        invoiceRepository.findById
                            .mockResolvedValue(
                                null
                            );


                        await expect(
                            useCase.execute({

                                invoiceId:
                                    "invoice-999",

                            })
                        ).rejects.toThrow(
                            'Invoice with ID "invoice-999" was not found.'
                        );

                    }
                );


                it(
                    "should expose statusCode 404 for not-found errors",
                    async () => {

                        invoiceRepository.findById
                            .mockResolvedValue(
                                null
                            );


                        try {

                            await useCase.execute({

                                invoiceId:
                                    "invoice-999",

                            });

                            throw new Error(
                                "Expected use case to throw."
                            );

                        } catch (error) {

                            expect(
                                error
                            ).toBeInstanceOf(
                                InvoiceNotFoundError
                            );


                            expect(
                                error.statusCode
                            ).toBe(404);

                        }

                    }
                );


                // ==========================================
                // VALIDATION
                // ==========================================

                it(
                    "should reject a missing invoice ID",
                    async () => {

                        await expect(
                            useCase.execute({})
                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findById
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject an empty invoice ID",
                    async () => {

                        await expect(
                            useCase.execute({

                                invoiceId:
                                    "",

                            })
                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findById
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject a whitespace-only invoice ID",
                    async () => {

                        await expect(
                            useCase.execute({

                                invoiceId:
                                    "   ",

                            })
                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findById
                        ).not.toHaveBeenCalled();

                    }
                );


                it(
                    "should reject a non-string invoice ID",
                    async () => {

                        await expect(
                            useCase.execute({

                                invoiceId:
                                    123,

                            })
                        ).rejects.toMatchObject({

                            name:
                                "ValidationError",

                            statusCode:
                                400,

                        });


                        expect(
                            invoiceRepository.findById
                        ).not.toHaveBeenCalled();

                    }
                );


                // ==========================================
                // TRANSACTION
                // ==========================================

                it(
                    "should pass the transaction to the repository",
                    async () => {

                        const invoice = {

                            id:
                                "invoice-123",

                        };


                        const trx = {

                            id:
                                "transaction-123",

                        };


                        invoiceRepository.findById
                            .mockResolvedValue(
                                invoice
                            );


                        await useCase.execute({

                            invoiceId:
                                "invoice-123",

                            trx,

                        });


                        expect(
                            invoiceRepository.findById
                        ).toHaveBeenCalledWith(
                            "invoice-123",
                            trx
                        );

                    }
                );

            }
        );

    }
);