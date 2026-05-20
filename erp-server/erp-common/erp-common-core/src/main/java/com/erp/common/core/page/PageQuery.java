package com.erp.common.core.page;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class PageQuery {

    @Min(value = 1, message = "页码不能小于1")
    private Integer pageNum = 1;

    @Min(value = 1, message = "每页大小不能小于1")
    @Max(value = 500, message = "每页大小不能超过500")
    private Integer pageSize = 20;

    private String orderBy;

    private Boolean asc = true;
}
