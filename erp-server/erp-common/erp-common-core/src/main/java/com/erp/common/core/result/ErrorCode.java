package com.erp.common.core.result;

import lombok.Getter;

@Getter
public enum ErrorCode {

    // System Level: 10000-19999
    SUCCESS(200, "success"),
    BAD_REQUEST(400, "Bad Request"),
    UNAUTHORIZED(401, "Unauthorized"),
    FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Resource Not Found"),
    INTERNAL_ERROR(500, "Internal Server Error"),
    PARAM_ERROR(10001, "Parameter Error"),
    RESOURCE_NOT_FOUND(10002, "Resource Not Found"),

    // Auth: 10010-10099
    AUTH_TOKEN_EXPIRED(10010, "Token Expired"),
    AUTH_TOKEN_INVALID(10011, "Invalid Token"),
    AUTH_CREDENTIALS_ERROR(10012, "Invalid Credentials"),

    // Product Module: 20000-29999
    PRODUCT_NOT_FOUND(20001, "Product Not Found"),
    PRODUCT_CODE_EXISTS(20002, "Product Code Already Exists"),
    CATEGORY_NOT_FOUND(20003, "Category Not Found"),

    // Inventory Module: 30000-39999
    INVENTORY_INSUFFICIENT(30001, "Insufficient Inventory"),
    INVENTORY_NOT_FOUND(30002, "Inventory Record Not Found"),
    WAREHOUSE_NOT_FOUND(30003, "Warehouse Not Found"),

    // Sales Module: 40000-49999
    ORDER_NOT_FOUND(40001, "Order Not Found"),
    ORDER_STATUS_ERROR(40002, "Order Status Error"),
    CUSTOMER_NOT_FOUND(40003, "Customer Not Found"),

    // Purchase Module: 50000-59999
    PURCHASE_ORDER_NOT_FOUND(50001, "Purchase Order Not Found"),
    SUPPLIER_NOT_FOUND(50002, "Supplier Not Found"),

    // Finance Module: 60000-69999
    INVOICE_NOT_FOUND(60001, "Invoice Not Found"),
    PAYMENT_NOT_FOUND(60002, "Payment Not Found");

    private final Integer code;
    private final String message;

    ErrorCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
