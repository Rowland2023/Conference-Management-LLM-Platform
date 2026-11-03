import { jest } from '@jest/globals';
import { InvoiceService }
    from "../../../../../../src/conference-management/accounting-services/invoice/application/services/InvoiceService.js";

describe(
    "InvoiceService",
    () => {

        let createInvoiceUseCase;
        let issueInvoiceUseCase;
        let cancelInvoiceUseCase;
        let getInvoiceUseCase;
        let listInvoicesUseCase;

        let invoiceService;


        beforeEach(() => {

            createInvoiceUseCase = {

                execute:
                    jest.fn(),

            };


            issueInvoiceUseCase = {

                execute:
                    jest.fn(),

            };


            cancelInvoiceUseCase = {

                execute:
                    jest.fn(),

            };


            getInvoiceUseCase = {

                execute:
                    jest.fn(),

            };


            listInvoicesUseCase = {

                execute:
                    jest.fn(),

            };


            invoiceService =
                new InvoiceService({

                    createInvoiceUseCase,

                    issueInvoiceUseCase,

                    cancelInvoiceUseCase,

                    getInvoiceUseCase,

                    listInvoicesUseCase,

                });

        });


        describe(
            "create()",
            () => {

                test(
                    "delegates to CreateInvoiceUseCase",
                    async () => {

                        const command = {

                            conferenceName:
                                "Healthcare Conference",

                            clientName:
                                "Acme Ltd",

                        };


                        const expectedResult = {

                            id:
                                "invoice-123",

                        };


                        createInvoiceUseCase.execute
                            .mockResolvedValue(
                                expectedResult
                            );


                        const result =
                            await invoiceService.create(
                                command
                            );


                        expect(result)
                            .toBe(expectedResult);


                        expect(
                            createInvoiceUseCase.execute
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            createInvoiceUseCase.execute
                        ).toHaveBeenCalledWith(
                            command
                        );

                    }
                );

            }
        );


        describe(
            "issue()",
            () => {

                test(
                    "delegates to IssueInvoiceUseCase",
                    async () => {

                        const command = {

                            invoiceId:
                                "invoice-123",

                            issuedBy:
                                "user-123",

                        };


                        const expectedResult = {

                            id:
                                "invoice-123",

                            status:
                                "ISSUED",

                        };


                        issueInvoiceUseCase.execute
                            .mockResolvedValue(
                                expectedResult
                            );


                        const result =
                            await invoiceService.issue(
                                command
                            );


                        expect(result)
                            .toBe(expectedResult);


                        expect(
                            issueInvoiceUseCase.execute
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            issueInvoiceUseCase.execute
                        ).toHaveBeenCalledWith(
                            command
                        );

                    }
                );

            }
        );


        describe(
            "cancel()",
            () => {

                test(
                    "delegates to CancelInvoiceUseCase",
                    async () => {

                        const command = {

                            invoiceId:
                                "invoice-123",

                            reason:
                                "Client requested cancellation",

                            cancelledBy:
                                "user-123",

                        };


                        const expectedResult = {

                            id:
                                "invoice-123",

                            status:
                                "CANCELLED",

                        };


                        cancelInvoiceUseCase.execute
                            .mockResolvedValue(
                                expectedResult
                            );


                        const result =
                            await invoiceService.cancel(
                                command
                            );


                        expect(result)
                            .toBe(expectedResult);


                        expect(
                            cancelInvoiceUseCase.execute
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            cancelInvoiceUseCase.execute
                        ).toHaveBeenCalledWith(
                            command
                        );

                    }
                );

            }
        );


        describe(
            "get()",
            () => {

                test(
                    "delegates to GetInvoiceUseCase",
                    async () => {

                        const query = {

                            invoiceId:
                                "invoice-123",

                        };


                        const expectedResult = {

                            id:
                                "invoice-123",

                            invoiceNumber:
                                "INV-2026-00001",

                        };


                        getInvoiceUseCase.execute
                            .mockResolvedValue(
                                expectedResult
                            );


                        const result =
                            await invoiceService.get(
                                query
                            );


                        expect(result)
                            .toBe(expectedResult);


                        expect(
                            getInvoiceUseCase.execute
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            getInvoiceUseCase.execute
                        ).toHaveBeenCalledWith(
                            query
                        );

                    }
                );

            }
        );


        describe(
            "list()",
            () => {

                test(
                    "delegates to ListInvoicesUseCase",
                    async () => {

                        const query = {

                            status:
                                "ISSUED",

                            page:
                                1,

                            limit:
                                20,

                        };


                        const expectedResult = {

                            data: [],

                            page:
                                1,

                            limit:
                                20,

                            total:
                                0,

                        };


                        listInvoicesUseCase.execute
                            .mockResolvedValue(
                                expectedResult
                            );


                        const result =
                            await invoiceService.list(
                                query
                            );


                        expect(result)
                            .toBe(expectedResult);


                        expect(
                            listInvoicesUseCase.execute
                        ).toHaveBeenCalledTimes(1);


                        expect(
                            listInvoicesUseCase.execute
                        ).toHaveBeenCalledWith(
                            query
                        );

                    }
                );

            }
        );

    }
);