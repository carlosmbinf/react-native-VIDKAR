Ten en cuenta que en cada modificacion de frontend o backend se debe ser y modificar lo mas profesional posible, pues los proyectos trabajados son para clientes y queremos dar la mejor impresion y siempre pensar en posibles modificaciones a futuro, o sea a la hora de crear algo tambien pensar en lo que el usuario quisiera que le mostremos, tambien en el backend tenemos que hacer las cosas teniendo en cuenta futuras mejoras

las collection y sus schemas estan declaradas en esta url "components\collections\collections.js"

todo lo visual esta dentro de la carpeta "components"

los modulos que se usan en el proyecto se encuentran en el archivo "package.json"

es un proyecto con react-native y en la parte visual se usa react-native-paper

ejemplo de una venta
{
    "_id" : "dxqifK43yG6EB8qEz",
    "estado" : "PENDIENTE_ENTREGA",
    "userId" : "h3t8vsGRqM83eQhXj",
    "isCobrado" : true,
    "cobrado" : 1.07,
    "monedaCobrado" : "USD",
    "comentario" : "Venta realizada con MercadoPago",
    "metodoPago" : "MERCADOPAGO",
    "producto" : {
        "_id" : "MW4T5Yo2Xmkkp6PTi",
        "userId" : "h3t8vsGRqM83eQhXj",
        "idOrder" : "1304470713-d631fde2-eef6-4bfe-bad1-2df0fd793060",
        "status" : "COMPLETED",
        "type" : "MERCADOPAGO",
        "link" : "https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=1304470713-d631fde2-eef6-4bfe-bad1-2df0fd793060",
        "carritos" : [
            {
                "_id" : "qY2MXPcjb5QAhjwaE",
                "idUser" : "h3t8vsGRqM83eQhXj",
                "idAdmin" : "WwX53qa95tmhuJSrP",
                "cobrarUSD" : "1",
                "nombre" : "Martha",
                "recibirEnCuba" : NumberInt(350),
                "precioDolar" : NumberInt(350),
                "descuentoAdmin" : NumberInt(0),
                "tarjetaCUP" : "7282 9192 9292 9299",
                "comentario" : "Envío de prueba",
                "type" : "REMESA",
                "metodoPago" : "EFECTIVO",
                "monedaRecibirEnCuba" : "CUP",
                "entregado" : true,
                "createdAt" : ISODate("2025-08-04T11:38:48.482+0000"),
                "producto" : {

                },
                "extraFields" : {

                },
                "_version" : NumberInt(1)
            }
        ],
        "createdAt" : ISODate("2025-08-04T11:39:06.255+0000"),
        "data" : {
            "accounts_info" : null,
            "acquirer_reconciliation" : [

            ],
            "additional_info" : {
                "items" : [
                    {
                        "category_id" : "others",
                        "description" : "Envío de prueba",
                        "id" : "qY2MXPcjb5QAhjwaE",
                        "picture_url" : "https://http2.mlstatic.com/D_NQ_NP_808789-MLU89254214601_082025-F.jpg",
                        "quantity" : "1",
                        "title" : "Remesa para Martha",
                        "unit_price" : "1.07"
                    }
                ],
                "tracking_id" : "platform:v1-whitelabel,so:ALL,type:N/A,security:none"
            },
            "authorization_code" : "827758",
            "binary_mode" : true,
            "brand_id" : null,
            "build_version" : "3.117.1-hotfix-1",
            "call_for_authorize_id" : null,
            "captured" : true,
            "card" : {
                "bin" : "54299103",
                "cardholder" : {
                    "identification" : {
                        "number" : "66045125",
                        "type" : "CI"
                    },
                    "name" : "CARLOS MEDINA"
                },
                "country" : "URY",
                "date_created" : "2025-08-04T07:40:02.000-04:00",
                "date_last_updated" : "2025-08-04T07:40:02.000-04:00",
                "expiration_month" : NumberInt(3),
                "expiration_year" : NumberInt(2028),
                "first_six_digits" : "542991",
                "id" : "9551906033",
                "last_four_digits" : "3904",
                "tags" : [
                    "credit"
                ]
            },
            "charges_details" : [
                {
                    "accounts" : {
                        "from" : "collector",
                        "to" : "mp"
                    },
                    "amounts" : {
                        "original" : 3.24,
                        "refunded" : NumberInt(0)
                    },
                    "base_amount" : 44.3,
                    "client_id" : NumberInt(0),
                    "date_created" : "2025-08-04T07:40:02.000-04:00",
                    "id" : "120944306510-001",
                    "last_updated" : "2025-08-04T07:40:02.000-04:00",
                    "metadata" : {
                        "reason" : "",
                        "source" : "rule-engine",
                        "source_detail" : "processing_fee_charge"
                    },
                    "name" : "mercadopago_fee",
                    "rate" : 7.31,
                    "refund_charges" : [

                    ],
                    "reserve_id" : null,
                    "type" : "fee"
                }
            ],
            "charges_execution_info" : {
                "internal_execution" : {
                    "date" : "2025-08-04T07:40:02.483-04:00",
                    "execution_id" : "01K1TE39ZZ1JT3JYRWPM536N85"
                }
            },
            "collector_id" : NumberInt(1304470713),
            "corporation_id" : null,
            "counter_currency" : null,
            "coupon_amount" : NumberInt(0),
            "currency_id" : "UYU",
            "date_approved" : "2025-08-04T07:40:05.000-04:00",
            "date_created" : "2025-08-04T07:40:02.000-04:00",
            "date_last_updated" : "2025-08-04T07:40:05.000-04:00",
            "date_of_expiration" : null,
            "deduction_schema" : null,
            "description" : "Remesa para Martha",
            "differential_pricing_id" : null,
            "external_reference" : null,
            "fee_details" : [
                {
                    "amount" : 3.24,
                    "fee_payer" : "collector",
                    "type" : "mercadopago_fee"
                }
            ],
            "financing_group" : null,
            "id" : 120944306510.0,
            "installments" : NumberInt(1),
            "integrator_id" : null,
            "issuer_id" : "1083",
            "live_mode" : true,
            "marketplace_owner" : null,
            "merchant_account_id" : null,
            "merchant_number" : null,
            "metadata" : {

            },
            "money_release_date" : "2025-08-04T07:40:05.000-04:00",
            "money_release_schema" : null,
            "money_release_status" : "released",
            "notification_url" : "https://www.vidkar.com/mercadopago/webhook",
            "operation_type" : "regular_payment",
            "order" : {
                "id" : "32922707924",
                "type" : "mercadopago"
            },
            "payer" : {
                "email" : "yaimaduartes@gmail.com",
                "entity_type" : null,
                "first_name" : null,
                "id" : "1393639903",
                "identification" : {
                    "number" : "66332609",
                    "type" : "CI"
                },
                "last_name" : null,
                "operator_id" : null,
                "phone" : {
                    "number" : null,
                    "extension" : null,
                    "area_code" : null
                },
                "type" : null
            },
            "payment_method" : {
                "data" : {
                    "routing_data" : {
                        "merchant_account_id" : "138006"
                    }
                },
                "id" : "oca",
                "issuer_id" : "1083",
                "type" : "credit_card"
            },
            "payment_method_id" : "oca",
            "payment_type_id" : "credit_card",
            "platform_id" : null,
            "point_of_interaction" : {
                "business_info" : {
                    "branch" : "PX",
                    "sub_unit" : "checkout_pro",
                    "unit" : "online_payments"
                },
                "transaction_data" : {

                },
                "type" : "UNSPECIFIED"
            },
            "pos_id" : null,
            "processing_mode" : "aggregator",
            "refunds" : [

            ],
            "release_info" : null,
            "shipping_amount" : NumberInt(0),
            "sponsor_id" : null,
            "statement_descriptor" : "MERPAGO*PRESTAMOSKRLY",
            "status" : "approved",
            "status_detail" : "accredited",
            "store_id" : null,
            "tags" : null,
            "taxes_amount" : NumberInt(0),
            "transaction_amount" : 44.3,
            "transaction_amount_refunded" : NumberInt(0),
            "transaction_details" : {
                "acquirer_reference" : null,
                "external_resource_url" : null,
                "financial_institution" : null,
                "installment_amount" : 44.3,
                "net_received_amount" : 41.06,
                "overpaid_amount" : NumberInt(0),
                "payable_deferral_period" : null,
                "payment_method_reference_id" : null,
                "total_paid_amount" : 44.3
            },
            "api_response" : {
                "status" : NumberInt(200),
                "headers" : {
                    "date" : [
                        "Mon, 04 Aug 2025 11:40:05 GMT"
                    ],
                    "content-type" : [
                        "application/json;charset=UTF-8"
                    ],
                    "transfer-encoding" : [
                        "chunked"
                    ],
                    "connection" : [
                        "keep-alive"
                    ],
                    "vary" : [
                        "Accept-Encoding, Accept,Accept-Encoding"
                    ],
                    "cache-control" : [
                        "max-age=0"
                    ],
                    "x-content-type-options" : [
                        "nosniff"
                    ],
                    "x-request-id" : [
                        "8eb7a1b4-ac76-4f99-9763-46bc9e80af52"
                    ],
                    "x-xss-protection" : [
                        "1; mode=block"
                    ],
                    "strict-transport-security" : [
                        "max-age=16070400; includeSubDomains; preload, max-age=31536000; includeSubDomains"
                    ],
                    "access-control-allow-origin" : [
                        "*"
                    ],
                    "access-control-allow-headers" : [
                        "Content-Type"
                    ],
                    "access-control-allow-methods" : [
                        "PUT, GET, POST, DELETE, OPTIONS"
                    ],
                    "access-control-max-age" : [
                        "86400"
                    ],
                    "timing-allow-origin" : [
                        "*"
                    ],
                    "content-encoding" : [
                        "gzip"
                    ]
                }
            }
        },
        "fechaPago" : ISODate("2025-08-04T11:40:05.676+0000"),
        "paymentId" : "120944306510"
    },
    "precioOficial" : NumberInt(1),
    "createdAt" : ISODate("2025-08-04T11:40:05.692+0000"),
    "recividoEnCuba" : NumberInt(0),
    "monedaRecividoEnCuba" : "CUP",
    "monedaPrecioOficial" : "CUP"
}
esa venta tiene un producto y ese producto tiene una lista de carritos, el estado de la venta debe clasificarse dependiendo del status del carrito


