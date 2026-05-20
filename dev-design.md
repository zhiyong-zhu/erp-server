# 全渠道ERP系统 详细开发设计文档

> 版本：v1.0  
> 更新日期：2026-05-20  
> 文档状态：初稿

---

## 一、文档概述

本文档为开发团队提供详细的实现指南，包括数据库设计、API 接口定义、核心模块实现方案、开发规范及交付计划。

---

## 二、数据库详细设计

### 2.1 ER 关系总览

```
产品分类 ←── 产品 ──→ 产品SKU
                │
                ├── BOM（物料清单）──→ 原料
                ├── 包装规格 ──→ 标签模板
                └── 价格策略

原料 ←── 供应商报价 ──→ 供应商
                              │
                        采购单明细 ──→ 采购单 ──→ 入库单
                                                      │
客户 ──→ 销售订单 ──→ 出库单 ──→ 库存流水 ←──────────┘
              │
              ├── 销项发票
              └── 退货单

进项发票 ←── 采购单
销项发票 + 进项发票 → 报税汇总
```

### 2.2 核心表结构

#### 2.2.1 系统管理表

```sql
-- 用户表
CREATE TABLE sys_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,       -- BCrypt 加密
    real_name VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    avatar VARCHAR(500),
    department_id UUID REFERENCES sys_department(id),
    status SMALLINT DEFAULT 1,            -- 1:正常 0:禁用
    last_login_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 部门表
CREATE TABLE sys_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES sys_department(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    sort_order INTEGER DEFAULT 0,
    leader_id UUID,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 角色表
CREATE TABLE sys_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,     -- 如 ROLE_ADMIN
    description VARCHAR(200),
    data_scope SMALLINT DEFAULT 1,        -- 1:全部 2:本部门 3:本人
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 用户角色关联
CREATE TABLE sys_user_role (
    user_id UUID REFERENCES sys_user(id),
    role_id UUID REFERENCES sys_role(id),
    PRIMARY KEY (user_id, role_id)
);

-- 权限/菜单表
CREATE TABLE sys_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES sys_permission(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,    -- 如 product:create
    type SMALLINT,                        -- 1:目录 2:菜单 3:按钮
    path VARCHAR(200),                    -- 前端路由
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1
);

-- 角色权限关联
CREATE TABLE sys_role_permission (
    role_id UUID REFERENCES sys_role(id),
    permission_id UUID REFERENCES sys_permission(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 操作日志表（按月分区）
CREATE TABLE sys_operation_log (
    id BIGSERIAL,
    user_id UUID,
    username VARCHAR(50),
    module VARCHAR(50),                   -- 所属模块
    action VARCHAR(50),                   -- 操作类型
    description VARCHAR(500),
    method VARCHAR(200),                  -- 请求方法
    request_url VARCHAR(500),
    request_params TEXT,
    response_code INTEGER,
    ip VARCHAR(50),
    duration INTEGER,                     -- 耗时(ms)
    created_at TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 数据字典
CREATE TABLE sys_dict_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200),
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sys_dict_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dict_type_code VARCHAR(100) REFERENCES sys_dict_type(code),
    label VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    css_class VARCHAR(100),
    status SMALLINT DEFAULT 1
);
```

#### 2.2.2 产品模块表

```sql
-- 产品分类
CREATE TABLE product_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES product_category(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 产品主表
CREATE TABLE product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES product_category(id),
    brand VARCHAR(100),
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    images TEXT[],                         -- 图片URL数组
    specifications JSONB,                  -- 动态规格定义 {"颜色":["红","蓝"], "尺寸":["S","M","L"]}
    status SMALLINT DEFAULT 0,            -- 0:草稿 1:在售 2:停用
    created_by UUID REFERENCES sys_user(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_product_code ON product(code);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_status ON product(status);
CREATE INDEX idx_product_name_gin ON product USING gin(to_tsvector('simple', name));

-- 产品SKU
CREATE TABLE product_sku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product(id),
    sku_code VARCHAR(50) NOT NULL UNIQUE,
    attributes JSONB NOT NULL,            -- {"颜色":"红","尺寸":"M"}
    barcode VARCHAR(100),
    price NUMERIC(12,2),                  -- 标准售价
    cost_price NUMERIC(12,2),             -- 成本价
    weight NUMERIC(10,3),
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sku_product ON product_sku(product_id);
CREATE INDEX idx_sku_barcode ON product_sku(barcode);

-- BOM 物料清单
CREATE TABLE product_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product(id),
    version VARCHAR(20) DEFAULT 'V1.0',
    status SMALLINT DEFAULT 1,            -- 1:有效 0:废弃
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_bom_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES product_bom(id),
    material_id UUID NOT NULL,            -- 引用原料或半成品
    material_type SMALLINT,               -- 1:原料 2:半成品
    quantity NUMERIC(12,4) NOT NULL,
    unit VARCHAR(20),
    loss_rate NUMERIC(5,2) DEFAULT 0,     -- 损耗率%
    remark VARCHAR(200),
    sort_order INTEGER DEFAULT 0
);

-- 包装规格
CREATE TABLE product_package (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product(id),
    level SMALLINT NOT NULL,              -- 1:单品 2:内盒 3:外箱
    name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,            -- 本层装入数量
    weight NUMERIC(10,3),
    dimensions JSONB,                     -- {"length":30,"width":20,"height":15,"unit":"cm"}
    barcode VARCHAR(100),
    label_template_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, level)
);

-- 标签模板
CREATE TABLE label_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    width_mm NUMERIC(6,1) NOT NULL,       -- 标签宽度
    height_mm NUMERIC(6,1) NOT NULL,      -- 标签高度
    template_config JSONB NOT NULL,       -- 模板配置（元素位置、字体等）
    preview_image VARCHAR(500),           -- 预览图URL
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.2.3 原料与供应商表

```sql
-- 原料分类
CREATE TABLE material_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES material_category(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

-- 原料主表
CREATE TABLE material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES material_category(id),
    unit VARCHAR(20) NOT NULL,
    specifications VARCHAR(500),
    default_supplier_id UUID,
    safety_stock NUMERIC(12,2) DEFAULT 0, -- 安全库存
    lead_time_days INTEGER,               -- 采购周期(天)
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 供应商
CREATE TABLE supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(500),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    tax_number VARCHAR(50),               -- 纳税人识别号
    credit_rating SMALLINT,               -- 信用评级 1-5
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 供应商报价
CREATE TABLE supplier_quotation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    material_id UUID NOT NULL REFERENCES material(id),
    price NUMERIC(12,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    min_order_qty NUMERIC(12,2),          -- 最小起订量
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.2.4 库存表

```sql
-- 仓库
CREATE TABLE warehouse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(500),
    manager_id UUID,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 货位
CREATE TABLE warehouse_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    area VARCHAR(50),                     -- 区域 (A/B/C)
    shelf VARCHAR(50),                    -- 货架
    layer VARCHAR(50),                    -- 层
    capacity NUMERIC(12,2),              -- 容量
    UNIQUE(warehouse_id, code)
);

-- 库存主表（当前库存快照）
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL,                 -- 产品SKU或原料ID
    item_type SMALLINT NOT NULL,          -- 1:产品 2:原料
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    location_id UUID REFERENCES warehouse_location(id),
    batch_no VARCHAR(50),                 -- 批次号
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,      -- 账面数量
    locked_quantity NUMERIC(12,2) DEFAULT 0,        -- 锁定数量(已分配未出库)
    available_quantity NUMERIC(12,2) 
        GENERATED ALWAYS AS (quantity - locked_quantity) STORED,  -- 可用数量
    cost_price NUMERIC(12,4),            -- 单位成本
    UNIQUE(sku_id, warehouse_id, location_id, batch_no)
);

CREATE INDEX idx_inventory_sku ON inventory(sku_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);

-- 库存流水表（按月分区，追加写入不可修改）
CREATE TABLE inventory_transaction (
    id BIGSERIAL,
    sku_id UUID NOT NULL,
    item_type SMALLINT NOT NULL,
    warehouse_id UUID NOT NULL,
    location_id UUID,
    transaction_type SMALLINT NOT NULL,   -- 1:采购入库 2:生产入库 3:退货入库
                                          -- 11:销售出库 12:领料出库 13:调拨出库
                                          -- 21:盘盈 22:盘亏 23:报废
    reference_type VARCHAR(50),           -- 关联单据类型
    reference_id UUID,                    -- 关联单据ID
    reference_code VARCHAR(50),           -- 关联单据编号
    quantity NUMERIC(12,2) NOT NULL,      -- 变动数量(正:入 负:出)
    before_quantity NUMERIC(12,2),        -- 变动前数量
    after_quantity NUMERIC(12,2),         -- 变动后数量
    batch_no VARCHAR(50),
    operator_id UUID,
    remark VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 创建月度分区示例
CREATE TABLE inventory_transaction_2026_01 
    PARTITION OF inventory_transaction 
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 盘点单
CREATE TABLE inventory_check (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    check_type SMALLINT,                  -- 1:全盘 2:抽盘
    status SMALLINT DEFAULT 0,            -- 0:草稿 1:进行中 2:待审批 3:已完成
    planned_date DATE,
    actual_date DATE,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_check_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id UUID NOT NULL REFERENCES inventory_check(id),
    sku_id UUID NOT NULL,
    location_id UUID,
    system_quantity NUMERIC(12,2),         -- 账面数量
    actual_quantity NUMERIC(12,2),         -- 实盘数量
    difference NUMERIC(12,2) 
        GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
    remark VARCHAR(200)
);
```

#### 2.2.5 采购表

```sql
-- 采购单
CREATE TABLE purchase_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    warehouse_id UUID REFERENCES warehouse(id),
    status SMALLINT DEFAULT 0,            -- 0:草稿 1:待审批 2:已审批 3:已下单
                                          -- 4:部分到货 5:已完成 6:已取消
    total_amount NUMERIC(14,2),
    tax_rate NUMERIC(5,2),
    tax_amount NUMERIC(14,2),
    total_with_tax NUMERIC(14,2),
    expected_date DATE,                   -- 预计到货日期
    remark VARCHAR(500),
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_order(id),
    material_id UUID NOT NULL REFERENCES material(id),
    quantity NUMERIC(12,2) NOT NULL,
    received_quantity NUMERIC(12,2) DEFAULT 0,
    unit_price NUMERIC(12,4) NOT NULL,
    amount NUMERIC(14,2),
    remark VARCHAR(200)
);

-- 采购入库单
CREATE TABLE purchase_receipt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id UUID REFERENCES purchase_order(id),
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    status SMALLINT DEFAULT 0,            -- 0:待验收 1:已验收 2:部分验收
    received_by UUID,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_receipt_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES purchase_receipt(id),
    material_id UUID NOT NULL,
    order_item_id UUID REFERENCES purchase_order_item(id),
    received_quantity NUMERIC(12,2) NOT NULL,
    qualified_quantity NUMERIC(12,2),      -- 合格数量
    rejected_quantity NUMERIC(12,2),       -- 不合格数量
    batch_no VARCHAR(50),
    location_id UUID REFERENCES warehouse_location(id),
    remark VARCHAR(200)
);
```

#### 2.2.6 销售与电商表

```sql
-- 客户
CREATE TABLE customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    customer_type SMALLINT,               -- 1:企业 2:个人
    contact_person VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(500),
    credit_limit NUMERIC(14,2),           -- 信用额度
    tax_number VARCHAR(50),
    payment_terms INTEGER,                -- 账期(天)
    sales_rep_id UUID,                    -- 销售负责人
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 销售订单
CREATE TABLE sale_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customer(id),
    order_source SMALLINT NOT NULL,       -- 1:手工 2:淘宝 3:京东 4:拼多多 5:抖音
    platform_order_no VARCHAR(100),       -- 平台订单号
    platform_data JSONB,                  -- 平台原始数据（保留完整信息）
    status SMALLINT DEFAULT 0,            -- 0:待确认 1:已确认 2:待发货 3:已发货
                                          -- 4:已完成 5:已取消 6:退货中
    total_amount NUMERIC(14,2),
    discount_amount NUMERIC(14,2) DEFAULT 0,
    freight_amount NUMERIC(14,2) DEFAULT 0,
    payable_amount NUMERIC(14,2),         -- 应付金额
    paid_amount NUMERIC(14,2) DEFAULT 0,
    payment_status SMALLINT DEFAULT 0,    -- 0:未付 1:部分付 2:已付
    shipping_address JSONB,               -- {"province","city","district","detail","name","phone"}
    warehouse_id UUID,
    remark VARCHAR(500),
    ordered_at TIMESTAMPTZ,               -- 下单时间
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sale_order_code ON sale_order(code);
CREATE INDEX idx_sale_order_customer ON sale_order(customer_id);
CREATE INDEX idx_sale_order_source ON sale_order(order_source);
CREATE INDEX idx_sale_order_status ON sale_order(status);
CREATE INDEX idx_sale_order_platform_no ON sale_order(platform_order_no);
CREATE INDEX idx_sale_order_created ON sale_order(created_at);

-- 销售订单明细
CREATE TABLE sale_order_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES sale_order(id),
    sku_id UUID NOT NULL REFERENCES product_sku(id),
    product_name VARCHAR(200),
    sku_name VARCHAR(200),
    quantity NUMERIC(12,2) NOT NULL,
    shipped_quantity NUMERIC(12,2) DEFAULT 0,
    unit_price NUMERIC(12,4) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    amount NUMERIC(14,2),
    remark VARCHAR(200)
);

-- 电商店铺
CREATE TABLE ecommerce_shop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform SMALLINT NOT NULL,           -- 2:淘宝 3:京东 4:拼多多 5:抖音
    shop_name VARCHAR(200) NOT NULL,
    shop_id VARCHAR(100),                 -- 平台店铺ID
    app_key VARCHAR(200),
    app_secret_encrypted VARCHAR(500),    -- AES加密存储
    access_token_encrypted VARCHAR(1000), -- AES加密存储
    refresh_token_encrypted VARCHAR(1000),
    token_expire_at TIMESTAMPTZ,
    sync_config JSONB,                    -- 同步配置 {"inventory_ratio":0.9, "sync_interval":300}
    status SMALLINT DEFAULT 1,            -- 1:正常 2:Token过期 0:禁用
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 电商同步日志
CREATE TABLE ecommerce_sync_log (
    id BIGSERIAL PRIMARY KEY,
    shop_id UUID REFERENCES ecommerce_shop(id),
    sync_type SMALLINT,                   -- 1:订单拉取 2:库存推送 3:物流回传
    status SMALLINT,                      -- 1:成功 2:失败 3:部分成功
    total_count INTEGER,
    success_count INTEGER,
    fail_count INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 物流信息
CREATE TABLE shipping_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_order_id UUID NOT NULL REFERENCES sale_order(id),
    carrier_code VARCHAR(50),             -- 快递公司编码
    carrier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    status SMALLINT DEFAULT 0,            -- 0:待揽收 1:运输中 2:已签收
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.2.7 财务与发票表

```sql
-- 发票主表
CREATE TABLE invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,     -- 系统内部编号
    invoice_type SMALLINT NOT NULL,       -- 1:销项专票 2:销项普票 3:进项专票 4:进项普票
    direction SMALLINT NOT NULL,          -- 1:销项(开出) 2:进项(收到)
    invoice_number VARCHAR(50),           -- 发票号码
    invoice_code VARCHAR(50),             -- 发票代码
    invoice_date DATE NOT NULL,
    buyer_name VARCHAR(200),
    buyer_tax_number VARCHAR(50),
    seller_name VARCHAR(200),
    seller_tax_number VARCHAR(50),
    amount NUMERIC(14,2) NOT NULL,        -- 不含税金额
    tax_rate NUMERIC(5,2),
    tax_amount NUMERIC(14,2),             -- 税额
    total_amount NUMERIC(14,2),           -- 价税合计
    status SMALLINT DEFAULT 0,            -- 0:草稿 1:已开具 2:已认证 3:已作废
    reference_type VARCHAR(50),           -- 关联单据类型 (sale_order/purchase_order)
    reference_id UUID,                    -- 关联单据ID
    verified BOOLEAN DEFAULT FALSE,       -- 是否已查验
    deductible BOOLEAN DEFAULT TRUE,      -- 是否可抵扣
    deduction_period VARCHAR(10),         -- 抵扣所属期 (2026-05)
    remark VARCHAR(500),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoice_type ON invoice(invoice_type);
CREATE INDEX idx_invoice_direction ON invoice(direction);
CREATE INDEX idx_invoice_date ON invoice(invoice_date);
CREATE INDEX idx_invoice_reference ON invoice(reference_type, reference_id);

-- 发票明细
CREATE TABLE invoice_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoice(id),
    item_name VARCHAR(200),
    specification VARCHAR(100),
    unit VARCHAR(20),
    quantity NUMERIC(12,2),
    unit_price NUMERIC(12,4),
    amount NUMERIC(14,2),
    tax_rate NUMERIC(5,2),
    tax_amount NUMERIC(14,2)
);

-- 报税汇总表（按月生成）
CREATE TABLE tax_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(10) NOT NULL UNIQUE,   -- 所属期 (2026-05)
    output_tax_amount NUMERIC(14,2),      -- 销项税额合计
    input_tax_amount NUMERIC(14,2),       -- 进项税额合计
    previous_credit NUMERIC(14,2) DEFAULT 0, -- 上期留抵
    payable_tax NUMERIC(14,2),            -- 应缴税额
    status SMALLINT DEFAULT 0,            -- 0:计算中 1:已确认 2:已申报
    generated_at TIMESTAMPTZ,
    confirmed_by UUID,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 价格策略
CREATE TABLE price_strategy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type SMALLINT NOT NULL,               -- 1:标准价 2:客户协议价 3:渠道价 4:促销价
    customer_id UUID REFERENCES customer(id),     -- 协议价关联客户
    channel SMALLINT,                     -- 渠道价关联平台
    sku_id UUID REFERENCES product_sku(id),
    price NUMERIC(12,2) NOT NULL,
    min_quantity NUMERIC(12,2),           -- 最低数量(阶梯价)
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    priority INTEGER DEFAULT 0,           -- 优先级(数值越大越优先)
    status SMALLINT DEFAULT 1,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_sku ON price_strategy(sku_id);
CREATE INDEX idx_price_type ON price_strategy(type);
CREATE INDEX idx_price_effective ON price_strategy(effective_from, effective_to);
```

#### 2.2.8 生产表

```sql
-- 工艺路线
CREATE TABLE process_route (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product(id),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT 'V1.0',
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 工序
CREATE TABLE process_step (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES process_route(id),
    step_no INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    standard_hours NUMERIC(8,2),          -- 标准工时(小时)
    equipment VARCHAR(200),               -- 所需设备
    sort_order INTEGER DEFAULT 0
);

-- 生产工单
CREATE TABLE production_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES product(id),
    sku_id UUID REFERENCES product_sku(id),
    bom_id UUID REFERENCES product_bom(id),
    route_id UUID REFERENCES process_route(id),
    planned_quantity NUMERIC(12,2) NOT NULL,
    completed_quantity NUMERIC(12,2) DEFAULT 0,
    defective_quantity NUMERIC(12,2) DEFAULT 0,
    status SMALLINT DEFAULT 0,            -- 0:计划 1:已下达 2:生产中 3:已完工 4:已入库
    planned_start DATE,
    planned_end DATE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 报工记录
CREATE TABLE production_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES production_order(id),
    step_id UUID NOT NULL REFERENCES process_step(id),
    worker_id UUID NOT NULL REFERENCES sys_user(id),
    quantity NUMERIC(12,2) NOT NULL,       -- 完成数量
    defective_qty NUMERIC(12,2) DEFAULT 0,
    work_hours NUMERIC(8,2),              -- 实际工时
    reported_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.2.9 审批流程表（Flowable 集成）

审批引擎基于 Flowable 7.x，流程定义（节点、分支、超时等）由 Flowable 内置表管理（启动时自动创建约 30 张 `ACT_*` 表）。本系统仅需自建一张业务关联表，用于将 Flowable 流程实例与业务单据绑定：

```sql
-- 业务单据与流程实例的关联表
CREATE TABLE biz_process_binding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_type VARCHAR(50) NOT NULL,       -- 业务类型 (purchase_order/price_strategy/return_order/inventory_check)
    business_id UUID NOT NULL,                -- 业务单据ID
    business_code VARCHAR(50),                -- 业务单据编号（用于展示）
    process_definition_key VARCHAR(100) NOT NULL, -- Flowable 流程定义KEY
    process_instance_id VARCHAR(64) NOT NULL, -- Flowable 流程实例ID
    title VARCHAR(200) NOT NULL,              -- 审批标题
    initiator_id UUID NOT NULL,               -- 发起人
    status SMALLINT DEFAULT 0,                -- 0:审批中 1:已通过 2:已拒绝 3:已撤回 4:已取消
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    UNIQUE(business_type, business_id)
);

CREATE INDEX idx_bpb_business ON biz_process_binding(business_type, business_id);
CREATE INDEX idx_bpb_initiator ON biz_process_binding(initiator_id);
CREATE INDEX idx_bpb_status ON biz_process_binding(status);
CREATE INDEX idx_bpb_process_instance ON biz_process_binding(process_instance_id);
```

#### 2.2.10 通知消息表

```sql
-- 通知模板
CREATE TABLE notification_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,         -- 模板编码，如 inventory_alert
    name VARCHAR(100) NOT NULL,
    channels SMALLINT[] NOT NULL,             -- 通知渠道：1:站内消息 2:邮件 3:移动端推送
    title_template VARCHAR(200) NOT NULL,     -- 标题模板，支持变量：{{productName}}
    content_template TEXT NOT NULL,           -- 内容模板，支持变量：{{currentStock}}
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 通知消息（用户收到的消息）
CREATE TABLE notification_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50),                -- 关联模板
    user_id UUID NOT NULL REFERENCES sys_user(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    business_type VARCHAR(50),                -- 关联业务类型
    business_id UUID,                         -- 关联业务ID
    channel SMALLINT NOT NULL,                -- 实际发送渠道：1:站内 2:邮件 3:推送
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    push_status SMALLINT DEFAULT 0,           -- 0:待发送 1:已发送 2:发送失败
    push_error VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_user ON notification_message(user_id, is_read);
CREATE INDEX idx_notification_created ON notification_message(created_at);

-- 通知订阅规则（用户可自定义接收哪些通知）
CREATE TABLE notification_subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES sys_user(id),
    template_code VARCHAR(50) NOT NULL,
    channels SMALLINT[] NOT NULL,             -- 用户选择接收的渠道
    enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, template_code)
);
```

#### 2.2.11 员工档案表

```sql
-- 员工档案（扩展 sys_user，存储人事信息）
CREATE TABLE employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES sys_user(id),
    employee_no VARCHAR(50) NOT NULL UNIQUE,  -- 工号
    real_name VARCHAR(50) NOT NULL,
    gender SMALLINT,                          -- 1:男 2:女
    birth_date DATE,
    id_card_no VARCHAR(100),                  -- 身份证号（加密存储）
    hire_date DATE NOT NULL,
    leave_date DATE,
    employment_status SMALLINT DEFAULT 1,     -- 1:在职 2:试用期 3:离职 4:停职
    position VARCHAR(100),                    -- 岗位
    department_id UUID REFERENCES sys_department(id),
    direct_supervisor_id UUID REFERENCES employee(id), -- 直属上级
    phone VARCHAR(20),
    emergency_contact VARCHAR(50),
    emergency_phone VARCHAR(20),
    address VARCHAR(500),
    remark VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employee_dept ON employee(department_id);
CREATE INDEX idx_employee_status ON employee(employment_status);
```

#### 2.2.12 编号规则配置表

```sql
-- 编号规则
CREATE TABLE serial_number_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_type VARCHAR(50) NOT NULL UNIQUE, -- 业务类型，如 sale_order / purchase_order
    name VARCHAR(100) NOT NULL,
    prefix VARCHAR(20) NOT NULL,               -- 前缀，如 SO / PO
    date_format VARCHAR(20),                   -- 日期格式，如 yyyyMMdd
    seq_length INTEGER NOT NULL DEFAULT 4,     -- 流水号位数
    reset_cycle SMALLINT DEFAULT 1,            -- 1:不重置 2:按天 3:按月 4:按年
    current_value INTEGER DEFAULT 0,           -- 当前流水号值
    current_period VARCHAR(20),                -- 当前周期标识（如 20260520）
    separator VARCHAR(5) DEFAULT '-',          -- 分隔符
    preview VARCHAR(100),                      -- 示例：SO-20260520-0001
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 编号使用记录（防止并发生成重复编号）
CREATE TABLE serial_number_usage (
    id BIGSERIAL PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES serial_number_rule(id),
    period VARCHAR(20) NOT NULL,
    generated_number VARCHAR(100) NOT NULL,
    business_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_serial_usage_number ON serial_number_usage(generated_number);
```

### 2.3 数据库索引策略

| 场景 | 索引类型 | 说明 |
|------|---------|------|
| 主键查询 | B-Tree (默认) | UUID 主键 |
| 编码/单号查询 | B-Tree UNIQUE | 精确匹配 |
| 状态筛选 | B-Tree | 低基数但高频 |
| 时间范围 | B-Tree | 分区键 + 索引配合 |
| 全文搜索 | GIN (tsvector) | 产品名称、客户名称 |
| JSONB 查询 | GIN | 动态规格属性 |
| 组合条件 | 复合索引 | 按查询频率设计 |

### 2.4 数据库迁移管理

使用 Flyway 管理数据库版本：

```
database/
├── flyway.conf
└── sql/
    ├── V1.0.0__init_system_tables.sql
    ├── V1.0.1__init_product_tables.sql
    ├── V1.0.2__init_inventory_tables.sql
    ├── V1.0.3__init_sales_tables.sql
    ├── V1.0.4__init_purchase_tables.sql
    ├── V1.0.5__init_finance_tables.sql
    ├── V1.0.6__init_production_tables.sql
    ├── V1.0.7__init_approval_tables.sql       # biz_process_binding
    ├── V1.0.8__init_notification_tables.sql   # 通知消息表
    ├── V1.0.9__init_employee_tables.sql       # 员工档案表
    ├── V1.0.10__init_serial_number_tables.sql # 编号规则表
    ├── V1.1.0__add_ecommerce_tables.sql
    └── R__create_partitions.sql          # 可重复执行的分区创建
    # 注：Flowable 的 ACT_* 表由引擎启动时自动创建，无需手动管理
```

---

## 三、API 接口设计

### 3.1 通用规范

**请求格式：**
- Content-Type: `application/json`
- 认证: `Authorization: Bearer {token}`

**分页请求参数：**
```json
{
  "pageNum": 1,
  "pageSize": 20,
  "orderBy": "created_at",
  "orderDirection": "desc"
}
```

**统一响应格式：**
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1716220800000
}
```

**分页响应：**
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "records": [],
    "total": 100,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 5
  }
}
```

### 3.2 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 用户登录 |
| POST | /api/v1/auth/logout | 用户登出 |
| POST | /api/v1/auth/refresh | 刷新Token |
| GET | /api/v1/auth/userinfo | 获取当前用户信息 |

**登录请求：**
```json
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "encrypted_password",
  "captcha": "abcd",
  "captchaKey": "uuid"
}
```

**登录响应：**
```json
{
  "code": 200,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 7200,
    "tokenType": "Bearer"
  }
}
```

### 3.3 产品模块接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/product/categories/tree | 获取分类树 |
| POST | /api/v1/product/categories | 创建分类 |
| GET | /api/v1/product/products | 产品列表(分页) |
| GET | /api/v1/product/products/{id} | 产品详情(含SKU) |
| POST | /api/v1/product/products | 创建产品 |
| PUT | /api/v1/product/products/{id} | 更新产品 |
| PUT | /api/v1/product/products/{id}/status | 变更状态 |
| GET | /api/v1/product/products/{id}/bom | 获取BOM |
| POST | /api/v1/product/products/{id}/bom | 设置BOM |
| GET | /api/v1/product/products/{id}/packages | 包装规格列表 |
| POST | /api/v1/product/products/{id}/packages | 设置包装规格 |
| GET | /api/v1/product/label-templates | 标签模板列表 |
| POST | /api/v1/product/label-templates | 创建标签模板 |
| POST | /api/v1/product/labels/preview | 标签预览 |
| POST | /api/v1/product/labels/print | 标签打印(云打印) |
| POST | /api/v1/product/products/import | Excel导入 |
| GET | /api/v1/product/products/export | Excel导出 |

**创建产品 POST /api/v1/product/products**
```json
// Request
{
  "code": "P20260001",
  "name": "不锈钢保温杯 500ml",
  "categoryId": "uuid-of-category",
  "brand": "品牌名",
  "unit": "个",
  "description": "产品描述文本",
  "images": ["https://oss.example.com/img1.jpg"],
  "specifications": {
    "颜色": ["银色", "黑色"],
    "容量": ["500ml"]
  },
  "skus": [
    {
      "attributes": {"颜色": "银色", "容量": "500ml"},
      "barcode": "6901234567890",
      "price": 89.00,
      "costPrice": 45.00,
      "weight": 0.35
    },
    {
      "attributes": {"颜色": "黑色", "容量": "500ml"},
      "barcode": "6901234567891",
      "price": 89.00,
      "costPrice": 45.00,
      "weight": 0.35
    }
  ]
}

// Response 200
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "uuid-of-product",
    "code": "P20260001",
    "status": 0,
    "createdAt": "2026-05-20T10:00:00+08:00"
  }
}
```

**产品列表 GET /api/v1/product/products**
```json
// Query: ?pageNum=1&pageSize=20&name=保温杯&categoryId=uuid&status=1&orderBy=created_at&orderDirection=desc

// Response 200
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "uuid",
        "code": "P20260001",
        "name": "不锈钢保温杯 500ml",
        "categoryName": "水杯/保温杯",
        "brand": "品牌名",
        "unit": "个",
        "status": 1,
        "skuCount": 2,
        "thumbnail": "https://oss.example.com/img1_thumb.jpg",
        "createdBy": "张三",
        "createdAt": "2026-05-20T10:00:00+08:00"
      }
    ],
    "total": 156,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 8
  }
}
```

**产品详情 GET /api/v1/product/products/{id}**
```json
// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid",
    "code": "P20260001",
    "name": "不锈钢保温杯 500ml",
    "categoryId": "uuid-of-category",
    "categoryName": "水杯/保温杯",
    "brand": "品牌名",
    "unit": "个",
    "description": "产品描述",
    "images": ["https://oss.example.com/img1.jpg"],
    "specifications": {"颜色": ["银色","黑色"], "容量": ["500ml"]},
    "status": 1,
    "statusName": "在售",
    "skus": [
      {
        "id": "uuid-of-sku",
        "skuCode": "SKU20260001",
        "attributes": {"颜色": "银色", "容量": "500ml"},
        "barcode": "6901234567890",
        "price": 89.00,
        "costPrice": 45.00,
        "weight": 0.35,
        "status": 1
      }
    ],
    "createdBy": "张三",
    "createdAt": "2026-05-20T10:00:00+08:00",
    "updatedBy": "李四",
    "updatedAt": "2026-05-21T14:30:00+08:00"
  }
}
```

**创建分类 POST /api/v1/product/categories**
```json
// Request
{
  "parentId": null,
  "name": "水杯/保温杯",
  "code": "CUP",
  "sortOrder": 1
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-category",
    "name": "水杯/保温杯",
    "code": "CUP"
  }
}
```

**设置BOM POST /api/v1/product/products/{id}/bom**
```json
// Request
{
  "version": "V1.0",
  "items": [
    {
      "materialId": "uuid-of-material",
      "materialType": 1,
      "quantity": 0.5,
      "unit": "kg",
      "lossRate": 2.0,
      "remark": "304不锈钢板材"
    },
    {
      "materialId": "uuid-of-material-2",
      "materialType": 1,
      "quantity": 1.0,
      "unit": "个",
      "lossRate": 0,
      "remark": "塑料盖"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "bomId": "uuid-of-bom",
    "version": "V1.0",
    "itemCount": 2
  }
}
```

**设置包装规格 POST /api/v1/product/products/{id}/packages**
```json
// Request
{
  "packages": [
    {
      "level": 1,
      "name": "单品",
      "quantity": 1,
      "weight": 0.35,
      "dimensions": {"length": 8, "width": 8, "height": 22, "unit": "cm"},
      "barcode": "6901234567890",
      "labelTemplateId": null
    },
    {
      "level": 2,
      "name": "内盒",
      "quantity": 6,
      "weight": 2.2,
      "dimensions": {"length": 30, "width": 25, "height": 24, "unit": "cm"},
      "barcode": "6901234567891",
      "labelTemplateId": "uuid-of-template"
    },
    {
      "level": 3,
      "name": "外箱",
      "quantity": 8,
      "weight": 18.0,
      "dimensions": {"length": 65, "width": 50, "height": 28, "unit": "cm"},
      "barcode": "6901234567892",
      "labelTemplateId": "uuid-of-template-2"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "packages": [
      {"id": "uuid-p1", "level": 1, "name": "单品", "quantity": 1},
      {"id": "uuid-p2", "level": 2, "name": "内盒", "quantity": 6},
      {"id": "uuid-p3", "level": 3, "name": "外箱", "quantity": 8}
    ]
  }
}
```

**标签打印 POST /api/v1/product/labels/print**
```json
// Request
{
  "items": [
    {
      "skuId": "uuid-of-sku",
      "packageLevel": 2,
      "labelTemplateId": "uuid-of-template",
      "quantity": 10
    }
  ],
  "printerId": "printer-name-or-id",
  "printMode": "pdf"
}

// Response 200
{
  "code": 200,
  "data": {
    "pdfUrl": "https://oss.example.com/labels/20260520/uuid.pdf",
    "totalCount": 10
  }
}
```

### 3.4 库存模块接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/inventory/stocks | 库存查询(分页) |
| GET | /api/v1/inventory/stocks/summary | 库存汇总 |
| GET | /api/v1/inventory/stocks/{skuId} | 单品库存详情 |
| POST | /api/v1/inventory/inbound | 手动入库 |
| POST | /api/v1/inventory/outbound | 手动出库 |
| POST | /api/v1/inventory/transfer | 调拨申请 |
| GET | /api/v1/inventory/transactions | 库存流水 |
| POST | /api/v1/inventory/checks | 创建盘点单 |
| PUT | /api/v1/inventory/checks/{id}/items | 录入盘点结果 |
| POST | /api/v1/inventory/checks/{id}/approve | 审批盘点 |
| GET | /api/v1/inventory/alerts | 库存预警列表 |

**库存查询 GET /api/v1/inventory/stocks**
```json
// Query: ?pageNum=1&pageSize=20&warehouseId=uuid&skuCode=SKU001&itemType=1&lowStock=true

// Response 200
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "uuid",
        "skuId": "uuid-of-sku",
        "skuCode": "SKU20260001",
        "productName": "不锈钢保温杯 500ml 银色",
        "itemType": 1,
        "warehouseId": "uuid-wh",
        "warehouseName": "主仓库",
        "locationCode": "A-01-03",
        "batchNo": "B20260520",
        "quantity": 500.00,
        "lockedQuantity": 30.00,
        "availableQuantity": 470.00,
        "costPrice": 45.0000,
        "totalValue": 22500.00
      }
    ],
    "total": 2300,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 115
  }
}
```

**库存汇总 GET /api/v1/inventory/stocks/summary**
```json
// Query: ?warehouseId=uuid

// Response 200
{
  "code": 200,
  "data": {
    "totalSkuCount": 2300,
    "totalQuantity": 156800.00,
    "totalValue": 2850000.00,
    "lowStockCount": 15,
    "overStockCount": 8,
    "warehouseSummary": [
      {"warehouseId": "uuid-wh", "warehouseName": "主仓库", "skuCount": 1800, "totalValue": 2200000.00},
      {"warehouseId": "uuid-wh2", "warehouseName": "副仓库", "skuCount": 500, "totalValue": 650000.00}
    ]
  }
}
```

**手动入库 POST /api/v1/inventory/inbound**
```json
// Request
{
  "warehouseId": "uuid-of-warehouse",
  "inboundType": 1,
  "referenceType": "purchase_order",
  "referenceId": "uuid-of-po",
  "items": [
    {
      "skuId": "uuid-of-sku",
      "itemType": 1,
      "quantity": 100.00,
      "locationId": "uuid-of-location",
      "batchNo": "B20260520",
      "costPrice": 45.0000,
      "remark": "采购入库"
    }
  ],
  "remark": "2026年5月采购入库"
}

// Response 200
{
  "code": 200,
  "data": {
    "transactionIds": ["uuid-tx1"],
    "totalQuantity": 100.00
  }
}
```

**手动出库 POST /api/v1/inventory/outbound**
```json
// Request
{
  "warehouseId": "uuid-of-warehouse",
  "outboundType": 11,
  "referenceType": "sale_order",
  "referenceId": "uuid-of-so",
  "items": [
    {
      "skuId": "uuid-of-sku",
      "itemType": 1,
      "quantity": 10.00,
      "locationId": "uuid-of-location",
      "batchNo": "B20260520",
      "remark": "销售出库"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "transactionIds": ["uuid-tx1"],
    "totalQuantity": 10.00
  }
}
```

**调拨申请 POST /api/v1/inventory/transfer**
```json
// Request
{
  "fromWarehouseId": "uuid-wh1",
  "toWarehouseId": "uuid-wh2",
  "items": [
    {
      "skuId": "uuid-of-sku",
      "itemType": 1,
      "quantity": 50.00,
      "fromLocationId": "uuid-loc-a",
      "toLocationId": "uuid-loc-b"
    }
  ],
  "remark": "仓库间调拨"
}

// Response 200
{
  "code": 200,
  "data": {
    "transferId": "uuid-of-transfer",
    "status": "pending_approval"
  }
}
```

**创建盘点单 POST /api/v1/inventory/checks**
```json
// Request
{
  "warehouseId": "uuid-of-warehouse",
  "checkType": 2,
  "plannedDate": "2026-05-25",
  "itemFilter": {
    "locationIds": ["uuid-loc-a", "uuid-loc-b"],
    "categoryIds": ["uuid-cat-1"]
  }
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-check",
    "code": "IC-20260525-0001",
    "status": 0,
    "itemCount": 45
  }
}
```

**录入盘点结果 PUT /api/v1/inventory/checks/{id}/items**
```json
// Request
{
  "items": [
    {
      "skuId": "uuid-of-sku",
      "locationId": "uuid-of-loc",
      "actualQuantity": 48.00
    },
    {
      "skuId": "uuid-of-sku2",
      "locationId": "uuid-of-loc",
      "actualQuantity": 102.00
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "updatedCount": 2,
    "differences": [
      {"skuId": "uuid-of-sku", "systemQuantity": 50.00, "actualQuantity": 48.00, "difference": -2.00},
      {"skuId": "uuid-of-sku2", "systemQuantity": 100.00, "actualQuantity": 102.00, "difference": 2.00}
    ]
  }
}
```

**库存预警列表 GET /api/v1/inventory/alerts**
```json
// Query: ?pageNum=1&pageSize=20&alertType=low_stock

// Response 200
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "uuid",
        "alertType": "low_stock",
        "materialId": "uuid-of-material",
        "materialName": "304不锈钢板材",
        "materialCode": "M20260010",
        "currentStock": 50.00,
        "safetyStock": 200.00,
        "suggestedOrderQty": 150.00,
        "unit": "kg",
        "defaultSupplierName": "某某钢材公司",
        "createdAt": "2026-05-20T08:00:00+08:00"
      }
    ],
    "total": 15,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 1
  }
}
```

### 3.5 销售模块接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/sales/customers | 客户列表 |
| POST | /api/v1/sales/customers | 创建客户 |
| GET | /api/v1/sales/orders | 销售订单列表 |
| GET | /api/v1/sales/orders/{id} | 订单详情 |
| POST | /api/v1/sales/orders | 创建订单 |
| PUT | /api/v1/sales/orders/{id}/confirm | 确认订单 |
| PUT | /api/v1/sales/orders/{id}/cancel | 取消订单 |
| POST | /api/v1/sales/orders/{id}/ship | 发货 |
| POST | /api/v1/sales/returns | 创建退货 |
| GET | /api/v1/sales/reports/summary | 销售汇总报表 |

**创建客户 POST /api/v1/sales/customers**
```json
// Request
{
  "name": "某某商贸有限公司",
  "shortName": "某某商贸",
  "customerType": 1,
  "contactPerson": "王经理",
  "phone": "13800138000",
  "email": "wang@example.com",
  "address": "广东省深圳市南山区科技园xxx",
  "creditLimit": 500000.00,
  "taxNumber": "91440300MA5XXXXX",
  "paymentTerms": 30,
  "salesRepId": "uuid-of-sales-rep"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-customer",
    "code": "CUS-20260520-0001",
    "name": "某某商贸有限公司"
  }
}
```

**创建订单 POST /api/v1/sales/orders**
```json
// Request
{
  "customerId": "uuid-of-customer",
  "orderSource": 1,
  "warehouseId": "uuid-of-warehouse",
  "items": [
    {
      "skuId": "uuid-of-sku",
      "productName": "不锈钢保温杯 500ml",
      "skuName": "银色 500ml",
      "quantity": 100.00,
      "unitPrice": 79.0000,
      "discountAmount": 200.00,
      "remark": ""
    }
  ],
  "discountAmount": 200.00,
  "freightAmount": 0.00,
  "shippingAddress": {
    "province": "广东省",
    "city": "深圳市",
    "district": "南山区",
    "detail": "科技园xxx栋xxx室",
    "name": "王经理",
    "phone": "13800138000"
  },
  "remark": "首次下单，请优先发货"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-order",
    "code": "SO-20260520-0001",
    "status": 0,
    "statusName": "待确认",
    "totalAmount": 7900.00,
    "discountAmount": 200.00,
    "freightAmount": 0.00,
    "payableAmount": 7700.00,
    "createdAt": "2026-05-20T10:00:00+08:00"
  }
}
```

**订单详情 GET /api/v1/sales/orders/{id}**
```json
// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-order",
    "code": "SO-20260520-0001",
    "customerId": "uuid-of-customer",
    "customerName": "某某商贸有限公司",
    "orderSource": 1,
    "orderSourceName": "手工",
    "platformOrderNo": null,
    "status": 2,
    "statusName": "待发货",
    "totalAmount": 7900.00,
    "discountAmount": 200.00,
    "freightAmount": 0.00,
    "payableAmount": 7700.00,
    "paidAmount": 7700.00,
    "paymentStatus": 2,
    "paymentStatusName": "已付",
    "shippingAddress": {
      "province": "广东省", "city": "深圳市", "district": "南山区",
      "detail": "科技园xxx栋xxx室", "name": "王经理", "phone": "13800138000"
    },
    "items": [
      {
        "id": "uuid-of-item",
        "skuId": "uuid-of-sku",
        "productName": "不锈钢保温杯 500ml",
        "skuName": "银色 500ml",
        "quantity": 100.00,
        "shippedQuantity": 0.00,
        "unitPrice": 79.0000,
        "discountAmount": 200.00,
        "amount": 7700.00
      }
    ],
    "shippings": [],
    "warehouseId": "uuid-of-wh",
    "warehouseName": "主仓库",
    "orderedAt": "2026-05-20T10:00:00+08:00",
    "paidAt": "2026-05-20T10:05:00+08:00",
    "createdBy": "张三",
    "createdAt": "2026-05-20T10:00:00+08:00",
    "updatedBy": "张三",
    "updatedAt": "2026-05-20T10:05:00+08:00"
  }
}
```

**发货 POST /api/v1/sales/orders/{id}/ship**
```json
// Request
{
  "shippings": [
    {
      "carrierCode": "SF",
      "carrierName": "顺丰速运",
      "trackingNumber": "SF1234567890"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "shippingOrderId": "uuid-of-shipping",
    "status": "shipped",
    "shippedAt": "2026-05-20T15:00:00+08:00"
  }
}
```

**创建退货 POST /api/v1/sales/returns**
```json
// Request
{
  "originalOrderId": "uuid-of-original-order",
  "returnReason": "商品质量问题",
  "items": [
    {
      "orderItemId": "uuid-of-order-item",
      "skuId": "uuid-of-sku",
      "quantity": 10.00,
      "refundAmount": 770.00
    }
  ],
  "remark": "客户反馈有划痕"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-return",
    "code": "RT-20260520-0001",
    "status": 0,
    "totalRefundAmount": 770.00
  }
}
```

**销售汇总报表 GET /api/v1/sales/reports/summary**
```json
// Query: ?periodType=month&from=2026-05-01&to=2026-05-31&groupBy=product

// Response 200
{
  "code": 200,
  "data": {
    "summary": {
      "totalOrders": 358,
      "totalAmount": 1250000.00,
      "totalCost": 680000.00,
      "totalProfit": 570000.00,
      "profitRate": 0.456,
      "averageOrderAmount": 3491.62
    },
    "details": [
      {
        "groupKey": "不锈钢保温杯 500ml",
        "quantity": 1500.00,
        "amount": 118500.00,
        "cost": 67500.00,
        "profit": 51000.00,
        "profitRate": 0.4304
      }
    ]
  }
}
```

### 3.6 采购模块接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/purchase/orders | 采购单列表 |
| POST | /api/v1/purchase/orders | 创建采购单 |
| PUT | /api/v1/purchase/orders/{id}/approve | 审批 |
| POST | /api/v1/purchase/receipts | 创建到货单 |
| PUT | /api/v1/purchase/receipts/{id}/inspect | 验收 |

**创建采购单 POST /api/v1/purchase/orders**
```json
// Request
{
  "supplierId": "uuid-of-supplier",
  "warehouseId": "uuid-of-warehouse",
  "taxRate": 13.00,
  "expectedDate": "2026-06-05",
  "items": [
    {
      "materialId": "uuid-of-material",
      "quantity": 500.00,
      "unitPrice": 25.0000,
      "remark": "304不锈钢板材"
    },
    {
      "materialId": "uuid-of-material-2",
      "quantity": 1000.00,
      "unitPrice": 3.5000,
      "remark": "塑料盖"
    }
  ],
  "remark": "6月生产备料"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-po",
    "code": "PO-20260520-0001",
    "status": 0,
    "statusName": "草稿",
    "totalAmount": 16000.00,
    "taxAmount": 2080.00,
    "totalWithTax": 18080.00,
    "createdAt": "2026-05-20T10:00:00+08:00"
  }
}
```

**审批采购单 PUT /api/v1/purchase/orders/{id}/approve**
```json
// Request
{
  "action": "approve",
  "comment": "价格合理，同意采购"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-po",
    "status": 2,
    "statusName": "已审批",
    "approvedBy": "uuid-of-approver",
    "approvedAt": "2026-05-20T11:00:00+08:00"
  }
}
```

**创建到货单 POST /api/v1/purchase/receipts**
```json
// Request
{
  "purchaseOrderId": "uuid-of-po",
  "warehouseId": "uuid-of-warehouse",
  "items": [
    {
      "materialId": "uuid-of-material",
      "orderItemId": "uuid-of-poi",
      "receivedQuantity": 500.00,
      "batchNo": "B20260520",
      "locationId": "uuid-of-location"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-receipt",
    "code": "PR-20260520-0001",
    "status": 0,
    "statusName": "待验收"
  }
}
```

**验收 PUT /api/v1/purchase/receipts/{id}/inspect**
```json
// Request
{
  "items": [
    {
      "id": "uuid-of-receipt-item",
      "qualifiedQuantity": 490.00,
      "rejectedQuantity": 10.00,
      "batchNo": "B20260520",
      "locationId": "uuid-of-location",
      "remark": "10kg表面有划痕，退货"
    }
  ]
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-receipt",
    "status": 1,
    "statusName": "已验收",
    "receivedAt": "2026-05-20T14:00:00+08:00",
    "inventoryTransactionIds": ["uuid-tx1"]
  }
}
```

### 3.7 财务模块接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/finance/invoices | 发票列表 |
| POST | /api/v1/finance/invoices | 创建/录入发票 |
| POST | /api/v1/finance/invoices/{id}/issue | 开具发票 |
| POST | /api/v1/finance/invoices/{id}/verify | 查验发票 |
| GET | /api/v1/finance/tax/summary | 报税汇总 |
| POST | /api/v1/finance/tax/calculate | 计算应缴税额 |
| GET | /api/v1/finance/tax/report | 导出申报表 |
| GET | /api/v1/finance/prices | 价格策略列表 |
| POST | /api/v1/finance/prices | 创建价格策略 |

**创建发票 POST /api/v1/finance/invoices**
```json
// Request（销项发票）
{
  "invoiceType": 1,
  "direction": 1,
  "invoiceDate": "2026-05-20",
  "buyerName": "某某商贸有限公司",
  "buyerTaxNumber": "91440300MA5XXXXX",
  "sellerName": "我方公司名称",
  "sellerTaxNumber": "91440300MA5YYYYY",
  "referenceType": "sale_order",
  "referenceId": "uuid-of-sale-order",
  "items": [
    {
      "itemName": "不锈钢保温杯 500ml",
      "specification": "银色",
      "unit": "个",
      "quantity": 100.00,
      "unitPrice": 69.9115,
      "amount": 6991.15,
      "taxRate": 13.00,
      "taxAmount": 908.85
    }
  ],
  "remark": "关联销售单 SO-20260520-0001"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-invoice",
    "code": "INV-20260520-0001",
    "invoiceType": 1,
    "invoiceTypeName": "销项增值税专用发票",
    "amount": 6991.15,
    "taxAmount": 908.85,
    "totalAmount": 7900.00,
    "status": 0,
    "statusName": "草稿"
  }
}
```

**开具发票 POST /api/v1/finance/invoices/{id}/issue**
```json
// Request
{
  "invoiceNumber": "23442000000012345678",
  "invoiceCode": "044002100311"
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-invoice",
    "status": 1,
    "statusName": "已开具",
    "invoiceNumber": "23442000000012345678",
    "invoiceCode": "044002100311"
  }
}
```

**报税汇总 GET /api/v1/finance/tax/summary**
```json
// Query: ?period=2026-05

// Response 200
{
  "code": 200,
  "data": {
    "period": "2026-05",
    "outputTaxAmount": 156000.00,
    "outputInvoiceCount": 85,
    "inputTaxAmount": 92000.00,
    "inputInvoiceCount": 42,
    "inputCertifiedAmount": 88000.00,
    "inputUncertifiedAmount": 4000.00,
    "previousCredit": 5000.00,
    "payableTax": 63000.00,
    "status": 0,
    "statusName": "计算中"
  }
}
```

**计算应缴税额 POST /api/v1/finance/tax/calculate**
```json
// Request
{
  "period": "2026-05"
}

// Response 200
{
  "code": 200,
  "data": {
    "period": "2026-05",
    "outputTaxAmount": 156000.00,
    "inputTaxAmount": 92000.00,
    "previousCredit": 5000.00,
    "payableTax": 59000.00,
    "calculationDetail": {
      "formula": "销项税额 - 进项税额 - 上期留抵 = 应缴税额",
      "calculation": "156000.00 - 92000.00 - 5000.00 = 59000.00"
    },
    "warnings": [
      {
        "type": "uncertified_invoice",
        "message": "存在4张进项发票未认证，合计税额4000.00元，将无法在当期抵扣"
      }
    ]
  }
}
```

**创建价格策略 POST /api/v1/finance/prices**
```json
// Request
{
  "name": "银色保温杯淘宝售价",
  "type": 3,
  "channel": 2,
  "skuId": "uuid-of-sku",
  "price": 79.00,
  "effectiveFrom": "2026-05-20T00:00:00+08:00",
  "effectiveTo": "2026-12-31T23:59:59+08:00",
  "priority": 10
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-price",
    "name": "银色保温杯淘宝售价",
    "type": 3,
    "typeName": "渠道价",
    "channel": 2,
    "channelName": "淘宝",
    "skuId": "uuid-of-sku",
    "price": 79.00,
    "status": 1,
    "needApproval": false
  }
}
```

### 3.8 电商集成接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/integration/shops | 店铺列表 |
| POST | /api/v1/integration/shops | 添加店铺 |
| POST | /api/v1/integration/shops/{id}/authorize | 平台授权 |
| POST | /api/v1/integration/shops/{id}/sync-orders | 手动同步订单 |
| POST | /api/v1/integration/shops/{id}/sync-inventory | 手动同步库存 |
| GET | /api/v1/integration/sync-logs | 同步日志 |

**添加店铺 POST /api/v1/integration/shops**
```json
// Request
{
  "platform": 2,
  "shopName": "某某旗舰店",
  "shopId": "12345678",
  "appKey": "app_key_from_platform",
  "appSecret": "app_secret_from_platform",
  "syncConfig": {
    "inventoryRatio": 0.9,
    "syncInterval": 300,
    "inventoryPool": "shared",
    "autoShipTracking": true
  }
}

// Response 200
{
  "code": 200,
  "data": {
    "id": "uuid-of-shop",
    "platform": 2,
    "platformName": "淘宝/天猫",
    "shopName": "某某旗舰店",
    "status": 0,
    "statusName": "待授权",
    "authorizeUrl": "https://oauth.taobao.com/authorize?app_key=xxx&redirect_uri=xxx"
  }
}
```

**手动同步订单 POST /api/v1/integration/shops/{id}/sync-orders**
```json
// Request
{
  "from": "2026-05-19T00:00:00+08:00",
  "to": "2026-05-20T23:59:59+08:00"
}

// Response 200
{
  "code": 200,
  "data": {
    "syncLogId": "uuid-of-log",
    "totalCount": 25,
    "successCount": 23,
    "failCount": 2,
    "failDetails": [
      {
        "platformOrderNo": "TB20260520001",
        "errorMessage": "SKU映射失败：平台规格'暗夜黑'未找到对应系统SKU"
      },
      {
        "platformOrderNo": "TB20260520002",
        "errorMessage": "库存不足：SKU20260001可用库存10，订单需20"
      }
    ]
  }
}
```

**手动同步库存 POST /api/v1/integration/shops/{id}/sync-inventory**
```json
// Request
{
  "skuIds": ["uuid-of-sku1", "uuid-of-sku2"],
  "forceAll": false
}

// Response 200
{
  "code": 200,
  "data": {
    "syncLogId": "uuid-of-log",
    "totalCount": 2,
    "successCount": 2,
    "failCount": 0,
    "details": [
      {"skuCode": "SKU20260001", "localStock": 470, "syncedStock": 423, "platform": "淘宝"},
      {"skuCode": "SKU20260002", "localStock": 200, "syncedStock": 180, "platform": "淘宝"}
    ]
  }
}
```

**同步日志 GET /api/v1/integration/sync-logs**
```json
// Query: ?pageNum=1&pageSize=20&shopId=uuid&syncType=1&status=2

// Response 200
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 101,
        "shopId": "uuid-of-shop",
        "shopName": "某某旗舰店",
        "platformName": "淘宝/天猫",
        "syncType": 1,
        "syncTypeName": "订单拉取",
        "status": 2,
        "statusName": "失败",
        "totalCount": 25,
        "successCount": 23,
        "failCount": 2,
        "errorMessage": "2条订单同步失败，详见明细",
        "startedAt": "2026-05-20T08:00:00+08:00",
        "finishedAt": "2026-05-20T08:00:15+08:00"
      }
    ],
    "total": 58,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 3
  }
}
```

### 3.9 错误码定义

| 错误码 | 说明 | 触发场景 |
|--------|------|---------|
| **系统级 (10000-19999)** | | |
| 10001 | 未登录或Token已过期 | 请求未携带有效Token |
| 10002 | 权限不足 | 无对应功能权限 |
| 10003 | 数据权限不足 | 越权访问其他部门/个人数据 |
| 10004 | 参数校验失败 | 请求参数不符合校验规则 |
| 10005 | 请求过于频繁 | 触发限流 |
| 10006 | 服务器内部错误 | 未捕获异常 |
| 10007 | 编号生成失败 | 编号规则配置错误或并发冲突 |
| **产品模块 (20000-29999)** | | |
| 20001 | 产品编码已存在 | 创建产品时code重复 |
| 20002 | 产品不存在 | 操作不存在或已删除的产品 |
| 20003 | 产品状态不允许此操作 | 如对草稿产品执行上架 |
| 20004 | SKU已关联库存，不可删除 | 删除有库存的SKU变体 |
| 20005 | BOM循环引用 | BOM中引用自身或形成环 |
| 20006 | BOM层级超过限制 | 超过10层 |
| 20007 | 分类不存在或已停用 | 引用无效分类 |
| 20008 | 标签模板配置无效 | template_config解析失败 |
| **库存模块 (30000-39999)** | | |
| 30001 | 库存不足 | 出库数量超过可用库存 |
| 30002 | 仓库不存在 | 引用无效仓库 |
| 30003 | 货位不存在或已满 | 引用无效或满载货位 |
| 30004 | 盘点进行中，禁止出入库 | 盘点期间该仓库/货位被锁定 |
| 30005 | 库存流水不可修改 | 尝试修改已写入的流水记录 |
| 30006 | 调拨单状态不允许此操作 | 如对已完成的调拨单再次审批 |
| 30007 | 批次号不存在 | 引用不存在的批次号 |
| **销售模块 (40000-49999)** | | |
| 40001 | 客户不存在 | 引用无效客户 |
| 40002 | 客户信用额度不足 | 订单金额超出信用额度 |
| 40003 | 订单状态不允许此操作 | 如对已取消订单执行发货 |
| 40004 | 订单明细库存锁定失败 | 库存不足或已被其他订单锁定 |
| 40005 | 退货数量超过原订单数量 | 退货qty > 原订单qty |
| 40006 | 退货单关联的原订单无效 | 原订单不存在或状态不正确 |
| 40007 | 重复的电商平台订单号 | platform_order_no已存在 |
| **财务模块 (50000-59999)** | | |
| 50001 | 发票金额与业务单据不匹配 | 差异超过0.01元 |
| 50002 | 进项发票已过认证期限 | 超过360天未认证 |
| 50003 | 红字发票未关联原蓝字发票 | 冲红操作缺少原发票 |
| 50004 | 报税数据已锁定，不可修改 | 已确认的报税周期关联发票不可修改 |
| 50005 | 售价低于成本价，需审批 | 价格 < 成本价×80% |
| 50006 | 价格策略时间段冲突 | 同SKU同类型策略时间重叠 |
| **集成模块 (60000-69999)** | | |
| 60001 | 电商平台Token已过期 | 需要重新授权 |
| 60002 | 电商平台API调用限流 | 触发平台rate limit |
| 60003 | SKU平台映射未配置 | 平台商品规格未关联系统SKU |
| 60004 | 平台订单数据解析失败 | platform_data格式异常 |
| 60005 | 库存同步失败 | 平台API返回错误 |
| 60006 | 物流单号回传失败 | 平台拒绝物流信息 |

---

## 四、核心模块实现方案

### 4.1 标签打印实现

#### 4.1.1 桌面端（Tauri 本地打印）

```
打印流程：
┌─────────┐    invoke     ┌──────────────┐    系统API    ┌─────────┐
│  React  │ ──────────── │  Rust 后端    │ ──────────── │  打印机  │
│  前端   │              │  print_label  │              │         │
└─────────┘              └──────────────┘              └─────────┘
     │                         │
     │ 1.选择产品/模板/数量     │ 2.根据模板配置生成图像
     │                         │ 3.调用系统打印API
     │ 4.返回打印结果           │   - Windows: Win32 GDI
     │◀────────────────────────│   - macOS/Linux: CUPS
```

**Tauri Command 定义：**
```rust
#[tauri::command]
async fn print_labels(params: PrintRequest) -> Result<PrintResult, String> {
    // 1. 解析标签模板配置(JSON)
    // 2. 获取产品数据填充模板
    // 3. 生成标签图像(使用 image crate)
    // 4. 调用系统打印机
    // 5. 返回结果
}

#[tauri::command]
async fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    // 列出系统可用打印机
}

#[tauri::command]
async fn preview_label(params: PreviewRequest) -> Result<String, String> {
    // 生成预览图(Base64 PNG)
}
```

#### 4.1.2 Web 端/移动端（云打印）

```
┌─────────┐   HTTP    ┌──────────────┐   生成PDF   ┌───────────────┐
│  前端   │ ─────── │  Spring Boot  │ ──────────  │  浏览器打印    │
│         │          │  /labels/print│             │  或云打印服务  │
└─────────┘          └──────────────┘             └───────────────┘
```

- 后端使用 iText/OpenPDF 生成 PDF
- 返回 PDF 流或 URL，前端调用浏览器打印
- 可选对接 BarTender Cloud API

#### 4.1.3 标签模板 JSONB Schema 定义

`label_template.template_config` 字段的完整 JSON 结构：

```json
{
  "version": "1.0",
  "width": 60,
  "height": 40,
  "unit": "mm",
  "dpi": 203,
  "orientation": "landscape",
  "padding": {"top": 2, "right": 2, "bottom": 2, "left": 2},
  "elements": [
    {
      "id": "el_1",
      "type": "text",
      "x": 5, "y": 3,
      "width": 50, "height": 6,
      "content": "{{productName}}",
      "fontSize": 12,
      "fontWeight": "bold",
      "fontFamily": "SimHei",
      "textAlign": "center",
      "color": "#000000",
      "overflow": "shrink"
    },
    {
      "id": "el_2",
      "type": "text",
      "x": 5, "y": 10,
      "width": 50, "height": 5,
      "content": "规格：{{skuAttributes}}",
      "fontSize": 9,
      "fontWeight": "normal",
      "textAlign": "left",
      "color": "#333333"
    },
    {
      "id": "el_3",
      "type": "barcode",
      "x": 10, "y": 16,
      "width": 40, "height": 12,
      "symbology": "CODE128",
      "content": "{{barcode}}",
      "showText": true,
      "textPosition": "bottom",
      "fontSize": 7,
      "quietZone": 2
    },
    {
      "id": "el_4",
      "type": "qrcode",
      "x": 45, "y": 28,
      "width": 10, "height": 10,
      "content": "https://erp.example.com/p/{{productId}}",
      "errorCorrection": "M",
      "quietZone": 1
    },
    {
      "id": "el_5",
      "type": "line",
      "x1": 0, "y1": 15,
      "x2": 60, "y2": 15,
      "strokeWidth": 0.3,
      "strokeColor": "#999999",
      "strokeStyle": "dashed"
    },
    {
      "id": "el_6",
      "type": "rectangle",
      "x": 3, "y": 28,
      "width": 54, "height": 10,
      "strokeWidth": 0.5,
      "strokeColor": "#000000",
      "fillColor": null,
      "cornerRadius": 0
    },
    {
      "id": "el_7",
      "type": "image",
      "x": 2, "y": 16,
      "width": 8, "height": 8,
      "source": "{{companyLogoUrl}}",
      "fit": "contain"
    }
  ]
}
```

**元素类型定义：**

| type | 必填属性 | 说明 |
|------|---------|------|
| `text` | content, fontSize | 静态文本或变量插值，支持 `{{变量名}}` 模板语法 |
| `barcode` | content, symbology | 一维条码，symbology 支持：CODE128 / EAN13 / CODE39 / UPC_A |
| `qrcode` | content | 二维码，errorCorrection 支持 L/M/Q/H |
| `line` | x1/y1/x2/y2 | 直线，支持 solid/dashed/dotted |
| `rectangle` | x/y/width/height | 矩形框，可选填充色和圆角 |
| `image` | source | 图片，来源为 URL 或 Base64，fit 支持 contain/cover/fill |

**变量插值可用字段：**

| 变量名 | 来源 | 示例值 |
|--------|------|--------|
| `{{productName}}` | product.name | 不锈钢保温杯 500ml |
| `{{skuCode}}` | product_sku.sku_code | SKU20260001 |
| `{{skuAttributes}}` | product_sku.attributes 拼接 | 银色/500ml |
| `{{barcode}}` | product_package.barcode 或 product_sku.barcode | 6901234567890 |
| `{{productCode}}` | product.code | P20260001 |
| `{{packageName}}` | product_package.name | 内盒 |
| `{{packageLevel}}` | product_package.level | 2 |
| `{{packageQuantity}}` | product_package.quantity | 6 |
| `{{weight}}` | product_package.weight | 2.2 |
| `{{dimensions}}` | product_package.dimensions 拼接 | 30×25×24cm |
| `{{batchNo}}` | 打印时动态输入 | B20260520 |
| `{{printDate}}` | 打印时系统生成 | 2026-05-20 |
| `{{companyName}}` | 系统参数 | 某某有限公司 |
| `{{companyLogoUrl}}` | 系统参数 | https://oss.example.com/logo.png |

**打印数据填充流程：**

```
选择产品 + 包装规格 + 标签模板
       │
       ▼
后端获取产品/SKU/包装数据
       │
       ▼
解析 template_config JSON
       │
       ▼
遍历 elements，替换 {{变量}} 为实际值
       │
       ▼
桌面端：Rust 侧渲染为图像 → 调用打印机API
Web端：Java 侧用 iText 渲染为 PDF → 返回浏览器
```

### 4.2 电商平台集成实现

#### 4.2.1 统一抽象层

```java
// 统一平台接口
public interface EcommercePlatformService {
    // 订单
    List<PlatformOrder> pullOrders(String shopId, LocalDateTime from, LocalDateTime to);
    void pushShippingInfo(String shopId, String platformOrderNo, ShippingInfo info);
    
    // 库存
    void pushInventory(String shopId, List<InventoryUpdate> updates);
    
    // Token管理
    TokenInfo refreshToken(String shopId);
}

// 各平台实现
@Service("taobaoService")
public class TaobaoServiceImpl implements EcommercePlatformService { ... }

@Service("jdService")
public class JdServiceImpl implements EcommercePlatformService { ... }

@Service("pddService")
public class PddServiceImpl implements EcommercePlatformService { ... }

@Service("douyinService")
public class DouyinServiceImpl implements EcommercePlatformService { ... }
```

#### 4.2.2 订单同步流程

```
定时任务(每5分钟) / 平台消息推送
         │
         ▼
┌─────────────────┐
│ 拉取新增订单     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     失败
│ 数据标准化映射   │───────────▶ 记录错误日志
└────────┬────────┘            通知运营
         │ 成功
         ▼
┌─────────────────┐
│ 发送到 RabbitMQ  │  (削峰)
│ order.sync queue │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 消费者处理       │
│ - 创建销售订单   │
│ - 锁定库存      │
│ - 记录同步日志   │
└─────────────────┘
```

#### 4.2.3 库存同步策略

```
库存变动事件(入库/出库/盘点)
         │
         ▼
┌─────────────────┐
│ 发布库存变动消息  │
│ inventory.change │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 库存同步消费者   │
│ 1. 查询当前可用  │
│ 2. 应用安全比例  │  (如 ×90%)
│ 3. 计算各店铺    │  分配量
│ 4. 调用平台API   │  推送
└────────┬────────┘
         │
         ├── 成功 → 更新最后同步时间
         └── 失败 → 重试(最多3次) → 人工处理队列
```

#### 4.2.4 各平台对接技术细节

##### 淘宝/天猫

| 项 | 说明 |
|----|------|
| SDK | `taobao-sdk-java-auto` (官方) |
| 接入方式 | TOP (Taobao Open Platform) |
| 认证流程 | AppKey + AppSecret → 引导用户授权 → 回调获取 session(=accessToken) → 用 session 调 API |
| Token 刷新 | `taobao.top.auth.token.refresh` 接口，refreshToken 有效期半年 |
| 订单拉取 | `taobao.trades.sold.get`（主动拉取）/ 淘宝消息服务（推送） |
| 库存推送 | `taobao.item.quantity.update`（单品）/ `taobao.item.skus.get` + `taobao.item.quantity.update`（SKU） |
| 物流回传 | `taobao.logistics.offline.send` |
| 退款同步 | `taobao.refunds.receive.get` |
| Rate Limit | App 级别万次/分钟，单用户级别按 API 不同，通常 100-500 次/分钟 |
| 沙箱环境 | `tbsandbox` 域名，需申请测试店铺 |

**订单字段映射（淘宝 → 系统）：**

| 淘宝字段 | 系统字段 | 转换规则 |
|----------|---------|---------|
| `tid` | sale_order.platform_order_no | 直传 |
| `status` | sale_order.status | 映射：`TRADE_FINISHED`→4, `WAIT_SELLER_SEND_GOODS`→2, `TRADE_CLOSED`→5 |
| `total_fee` | sale_order.total_amount | parseFloat |
| `discount_fee` | sale_order.discount_amount | parseFloat |
| `post_fee` | sale_order.freight_amount | parseFloat |
| `receiver_name` | shipping_address.name | 脱敏处理（淘宝默认脱敏） |
| `receiver_mobile` | shipping_address.phone | 脱敏，需申请权限获取完整号码 |
| `receiver_address` | shipping_address | 拆分 province/city/district/detail |
| `orders[].sku_id` | sale_order_item.skuId | 通过 SKU 映射表关联 |
| `orders[].title` | sale_order_item.productName | 直传 |
| `orders[].num` | sale_order_item.quantity | parseInt |
| `orders[].price` | sale_order_item.unitPrice | parseFloat |
| 原始 JSON | sale_order.platform_data | 整体存入 JSONB |

##### 京东

| 项 | 说明 |
|----|------|
| SDK | `jos-sdk-java` (京东开放平台) |
| 认证流程 | AppKey + AppSecret → OAuth2.0 授权 → 获取 accessToken（有效期 30 天） |
| Token 刷新 | `token.refresh` 接口，refreshToken 有效期 1 年 |
| 订单拉取 | `jingdong.pop.order.search`（主动）/ 京麦消息推送（JOS 消息服务） |
| 库存推送 | `jingdong.pop.inventory.update` |
| 物流回传 | `jingdong.pop.logistics.send` |
| Rate Limit | 单应用 10,000 次/分钟，按 API 粒度限流 |
| 沙箱环境 | `https://api.jdosandbox.com` |

**订单字段映射（京东 → 系统）：**

| 京东字段 | 系统字段 | 转换规则 |
|----------|---------|---------|
| `orderId` | sale_order.platform_order_no | 64位整数 → 字符串 |
| `orderState` | sale_order.status | 映射：`WAIT_SELLER_STOCK_OUT`→2, `FINISHED_L`→4, `TRADE_CANCELED`→5 |
| `orderSellerPrice` | sale_order.total_amount | 直传 |
| `orderDiscount` | sale_order.discount_amount | 直传 |
| `freightPrice` | sale_order.freight_amount | 直传 |
| `consigneeName` | shipping_address.name | 直传 |
| `consigneeMobile` | shipping_address.phone | 直传 |
| `consigneeAddress` | shipping_address.detail | 拼接省市区+详细地址 |
| `skuDetailList[].skuId` | sale_order_item.skuId | 通过映射表 |
| `skuDetailList[].productName` | sale_order_item.productName | 直传 |
| `skuDetailList[].itemCount` | sale_order_item.quantity | 直传 |
| `skuDetailList[].jdPrice` | sale_order_item.unitPrice | 直传 |

##### 拼多多

| 项 | 说明 |
|----|------|
| SDK | `pop-sdk-java` (拼多多开放平台) |
| 认证流程 | ClientId + ClientSecret → OAuth2.0 → accessToken（有效期 30 天） |
| Token 刷新 | `pdd.pop.auth.token.refresh` |
| 订单拉取 | `pdd.order.list.get` / 拼多多消息服务（HTTP 回调） |
| 库存推送 | `pdd.goods.sku.quantity.update` |
| 物流回传 | `pdd.logistics.online.send` |
| Rate Limit | 单店铺 500 次/分钟，单 API 独立计数 |
| 沙箱环境 | 拼多多开放平台沙箱 |

##### 抖音

| 项 | 说明 |
|----|------|
| SDK | 抖音开放平台 Java SDK / 直接 HTTP 调用 |
| 认证流程 | AppKey + AppSecret → OAuth2.0 → accessToken（有效期 15 天，需频繁刷新） |
| Token 刷新 | `token.refresh` 接口，refreshToken 有效期 30 天 |
| 订单拉取 | `order.list` / 抖音消息推送 |
| 库存推送 | `product.sku.syncStock` |
| 物流回传 | `order.logistics.add` |
| Rate Limit | 单应用 10,000 次/小时（较严格） |
| 沙箱环境 | 抖音开放平台测试环境 |

#### 4.2.5 SKU 平台映射表

各平台的商品 SKU 编码与系统内部 SKU 不同，需建立映射关系：

```sql
-- 平台SKU与系统SKU映射
CREATE TABLE ecommerce_sku_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES ecommerce_shop(id),
    platform SMALLINT NOT NULL,               -- 平台标识
    platform_product_id VARCHAR(100) NOT NULL, -- 平台商品ID
    platform_sku_id VARCHAR(100) NOT NULL,     -- 平台SKU ID
    system_sku_id UUID NOT NULL REFERENCES product_sku(id),
    platform_product_name VARCHAR(500),        -- 平台商品名称（冗余，便于排查）
    platform_sku_name VARCHAR(500),            -- 平台规格名称
    status SMALLINT DEFAULT 1,                 -- 1:有效 0:停用
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shop_id, platform_sku_id)
);

CREATE INDEX idx_sku_mapping_system ON ecommerce_sku_mapping(system_sku_id);
CREATE INDEX idx_sku_mapping_shop ON ecommerce_sku_mapping(shop_id);
```

**订单同步时的 SKU 解析流程：**

```
平台订单 → 获取 platformSkuId
    │
    ▼
查询 ecommerce_sku_mapping
    │
    ├── 找到映射 → 用 system_sku_id 创建 sale_order_item
    │
    └── 未找到映射 → 标记为"SKU未映射"异常
         │
         ▼
         记入同步日志 failDetails
         通知运营配置映射
         订单创建为"待处理"状态，人工介入
```

#### 4.2.6 Webhook / 消息推送接入

除定时拉取外，各平台支持消息推送，用于实时感知订单变化：

| 平台 | 推送方式 | 接入说明 |
|------|---------|---------|
| 淘宝 | 淘宝消息服务（TMC） | 长连接订阅，需开通消息服务权限 |
| 京东 | 京麦消息（JOS Message） | HTTP 回调，配置接收 URL |
| 拼多多 | HTTP 回调（Callback） | 配置回调 URL + 验签 |
| 抖音 | HTTP 回调（Webhook） | 配置回调 URL + 验签 |

**统一回调处理：**

```
平台 HTTP 回调 → Nginx → Spring Boot Controller
    │
    ▼
/api/v1/integration/callback/{platform}
    │
    ├── 1. 验签（用 AppSecret 校验请求签名）
    ├── 2. 解析消息体（各平台格式不同）
    ├── 3. 转换为统一事件格式
    └── 4. 发送到 RabbitMQ（topic: order.event）
              │
              ▼
         消费者处理（与定时拉取共用同一套入库逻辑）
```

### 4.3 报税自动计算实现

```
每月1日定时任务触发
         │
         ▼
┌─────────────────────────────────┐
│ 1. 查询上月已开销项发票          │
│    SUM(tax_amount)              │
│    WHERE direction=1            │
│    AND invoice_date BETWEEN ... │
├─────────────────────────────────┤
│ 2. 查询上月已认证进项发票        │
│    SUM(tax_amount)              │
│    WHERE direction=2            │
│    AND deductible=true          │
│    AND deduction_period=当期     │
├─────────────────────────────────┤
│ 3. 查询上期留抵税额             │
│    FROM tax_summary             │
│    WHERE period=上期            │
├─────────────────────────────────┤
│ 4. 计算：                       │
│    应缴 = 销项 - 进项 - 留抵     │
│    如果<0, 本期留抵=|应缴|       │
├─────────────────────────────────┤
│ 5. 写入 tax_summary 表          │
│    状态=计算中，待财务确认        │
└─────────────────────────────────┘
```

### 4.4 报表与数据分析设计

#### 4.4.1 销售报表

| 报表名 | 维度 | 度量 | 筛选条件 | 图表类型 | 优先级 |
|--------|------|------|---------|---------|--------|
| 销售日报/周报/月报 | 日期 | 订单数、销售金额、毛利、毛利率 | 时间范围、渠道来源 | 折线图 + 表格 | P0 |
| 销售排行 | 产品/客户/销售员 | 销售数量、销售金额、毛利 | 时间范围、排名TOP N | 横向柱状图 + 表格 | P0 |
| 渠道分析 | 订单来源(手工/淘宝/京东/...) | 订单数、金额、占比、退货率 | 时间范围 | 饼图 + 柱状图 | P0 |
| 客户贡献分析 | 客户 | 累计消费金额、订单数、客单价、最近下单日期 | 时间范围、客户分类 | 表格 + 帕累托图 | P0 |
| 销售趋势 | 月/周/日 | 同比、环比增长 | 时间范围（支持对比去年同期） | 双轴折线图 | P1 |
| 销售毛利明细 | 产品SKU | 单价、成本价、毛利、毛利率 | 时间范围、分类、毛利率区间 | 表格 | P1 |

**SQL 查询模板（销售月报）：**

```sql
SELECT
    DATE_TRUNC('month', so.created_at) AS month,
    COUNT(DISTINCT so.id) AS order_count,
    SUM(so.payable_amount) AS total_amount,
    SUM(soi.quantity * (soi.unit_price - COALESCE(ps.price, sku.cost_price))) AS gross_profit,
    ROUND(
        SUM(soi.quantity * (soi.unit_price - COALESCE(ps.price, sku.cost_price)))
        / NULLIF(SUM(so.payable_amount), 0) * 100, 2
    ) AS profit_rate
FROM sale_order so
JOIN sale_order_item soi ON soi.order_id = so.id
JOIN product_sku sku ON sku.id = soi.sku_id
LEFT JOIN price_strategy ps ON ps.sku_id = sku.id AND ps.type = 1
        AND so.created_at BETWEEN ps.effective_from AND ps.effective_to
WHERE so.status IN (3, 4)   -- 已发货或已完成
  AND so.created_at BETWEEN :startDate AND :endDate
  AND (:channel IS NULL OR so.order_source = :channel)
GROUP BY DATE_TRUNC('month', so.created_at)
ORDER BY month;
```

#### 4.4.2 库存报表

| 报表名 | 维度 | 度量 | 筛选条件 | 图表类型 | 优先级 |
|--------|------|------|---------|---------|--------|
| 库存总览 | 仓库、分类 | SKU数量、库存数量、库存金额（数量×成本价） | 仓库、分类、库存区间 | 表格 + 汇总卡片 | P0 |
| 库龄分析 | 产品SKU | 各库龄段数量和金额（0-30天/31-60天/61-90天/>90天） | 仓库、分类 | 堆叠柱状图 + 表格 | P0 |
| 周转率 | 产品/分类 | 周转率 = 销售成本 / 平均库存 | 时间范围、分类 | 表格 + 趋势线 | P0 |
| 呆滞预警 | 产品SKU | 呆滞天数、库存数量、库存金额、建议处理方式 | 呆滞天数阈值（默认90天） | 表格（可标红） | P0 |
| 出入库统计 | 日期、仓库 | 入库数量/金额、出库数量/金额、净变动 | 时间范围、仓库 | 折线图 + 表格 | P1 |

**SQL 查询模板（库龄分析）：**

```sql
SELECT
    p.name AS product_name,
    sku.sku_code,
    sku.attributes->>'颜色' AS color,
    w.name AS warehouse_name,
    it.quantity,
    it.cost_price,
    it.quantity * it.cost_price AS stock_value,
    CURRENT_DATE - it.created_at::date AS age_days,
    CASE
        WHEN CURRENT_DATE - it.created_at::date <= 30 THEN '0-30天'
        WHEN CURRENT_DATE - it.created_at::date <= 60 THEN '31-60天'
        WHEN CURRENT_DATE - it.created_at::date <= 90 THEN '61-90天'
        ELSE '>90天'
    END AS age_bucket
FROM inventory it
JOIN product_sku sku ON sku.id = it.sku_id
JOIN product p ON p.id = sku.product_id
JOIN warehouse w ON w.id = it.warehouse_id
WHERE it.quantity > 0
  AND (:warehouse_id IS NULL OR it.warehouse_id = :warehouse_id)
ORDER BY age_days DESC;
```

#### 4.4.3 采购报表

| 报表名 | 维度 | 度量 | 筛选条件 | 图表类型 | 优先级 |
|--------|------|------|---------|---------|--------|
| 采购汇总 | 供应商、原料 | 采购金额、采购次数、平均交货周期 | 时间范围、供应商 | 表格 + 柱状图 | P1 |
| 供应商对账 | 供应商 | 应付金额、已付金额、未付金额 | 时间范围、供应商 | 表格 | P1 |
| 到货率统计 | 供应商 | 订单数、按时到货率、合格率 | 时间范围 | 表格 + 饼图 | P1 |

#### 4.4.4 财务报表

| 报表名 | 维度 | 度量 | 筛选条件 | 图表类型 | 优先级 |
|--------|------|------|---------|---------|--------|
| 利润报表 | 月 | 营收、成本、毛利、毛利率、费用、净利润 | 时间范围（按月） | 折线图 + 表格 | P1 |
| 应收应付 | 客户/供应商 | 应收/应付余额、账龄(0-30/31-60/61-90/>90天) | 截止日期 | 表格 + 堆叠柱状图 | P1 |
| 税负率分析 | 月 | 销项税额、进项税额、应缴税额、税负率(应缴/营收) | 时间范围 | 双轴折线图 | P1 |
| 发票台账 | 月、发票类型 | 开票金额、收票金额、未认证金额 | 时间范围、发票类型 | 表格 | P0 |

#### 4.4.5 生产报表

| 报表名 | 维度 | 度量 | 筛选条件 | 图表类型 | 优先级 |
|--------|------|------|---------|---------|--------|
| 产能利用率 | 产线/工序 | 计划工时、实际工时、利用率 | 时间范围 | 仪表盘 + 表格 | P2 |
| 工单完成率 | 产品、日期 | 计划数量、完成数量、完成率、良品率 | 时间范围 | 折线图 + 表格 | P2 |
| 良品率 | 产品、工序 | 合格数量、次品数量、良品率 | 时间范围 | 折线图 | P2 |

#### 4.4.6 仪表盘（Dashboard）设计

每个角色一个仪表盘，由多个 Widget 组成：

**总经理仪表盘：**

| Widget | 类型 | 数据源 | 刷新频率 |
|--------|------|--------|---------|
| 今日/本月营收 | 数字卡片 | sale_order SUM(payable_amount) | 5分钟 |
| 本月毛利 | 数字卡片 | 销售金额 - 销售成本 | 5分钟 |
| 库存总金额 | 数字卡片 | inventory SUM(quantity * cost_price) | 10分钟 |
| 应收应付概览 | 双数字卡片 | 客户应收余额 / 供应商应付余额 | 10分钟 |
| 月度营收趋势 | 折线图 | 近12个月营收数据 | 每日 |
| 销售渠道占比 | 饼图 | 按 order_source 分组 | 每日 |
| 库存预警 TOP10 | 列表 | 低于安全库存的 SKU | 5分钟 |
| 待审批事项 | 列表 | Flowable 待办任务 | 实时 |

**仓库主管仪表盘：**

| Widget | 类型 | 数据源 | 刷新频率 |
|--------|------|--------|---------|
| 今日入库/出库 | 双数字卡片 | 今日 inventory_transaction 汇总 | 5分钟 |
| 待发货订单数 | 数字卡片 | sale_order WHERE status=2 | 5分钟 |
| 库存预警数 | 数字卡片 | 低于安全库存的 SKU 数量 | 5分钟 |
| 出入库趋势 | 折线图 | 近7天出入库数量 | 每日 |
| 待处理调拨 | 列表 | 调拨单待审批 | 实时 |
| 今日盘点进度 | 进度条 | 盘点单完成率 | 5分钟 |

**销售仪表盘：**

| Widget | 类型 | 数据源 | 刷新频率 |
|--------|------|--------|---------|
| 今日订单数/金额 | 双数字卡片 | 今日 sale_order | 5分钟 |
| 本月达成率 | 进度环 | 本月实际 / 月度目标 × 100% | 每日 |
| 待处理订单 | 数字卡片 | status=0 或 1 的订单数 | 5分钟 |
| 个人销售排行 | 横向柱状图 | 团队成员本月销售额 | 每日 |
| 最近7天趋势 | 折线图 | 近7天每日订单数和金额 | 每日 |

**财务仪表盘：**

| Widget | 类型 | 数据源 | 刷新频率 |
|--------|------|--------|---------|
| 本月开票额 | 数字卡片 | 本月已开销项发票金额 | 10分钟 |
| 待收款金额 | 数字卡片 | 客户应收余额 | 10分钟 |
| 本月税额 | 数字卡片 | tax_summary 当期数据 | 每日 |
| 报税进度 | 步骤条 | tax_summary status | 每日 |
| 进项认证提醒 | 列表 | 即将过期未认证的进项发票 | 每日 |

#### 4.4.7 报表导出格式

| 格式 | 触发方式 | 实现方案 |
|------|---------|---------|
| Excel (.xlsx) | 列表页"导出"按钮 | Apache POI / Alibaba EasyExcel，服务端生成后通过 RustFS 返回下载链接 |
| PDF | 报表页"打印"按钮 | OpenPDF 生成，含公司抬头和页脚 |
| 在线查看 | 默认 | 前端 ECharts 渲染 + Ant Design Table |

### 4.5 离线支持实现（桌面端）

```
在线状态：
  所有请求 → Spring Boot API → 正常响应

离线检测：
  心跳检测(每30s) → API 不可达 → 切换离线模式

离线模式：
  - 只读操作 → 从本地 SQLite 读取缓存数据
  - 写操作 → 存入本地队列(SQLite)
  - UI 提示离线状态

网络恢复：
  心跳成功 → 切换在线模式
  → 同步本地队列到服务端(按时间顺序)
  → 冲突检测(版本号比对)
  → 冲突时提示用户选择
  → 刷新本地缓存
```

**离线缓存的数据范围：**
- 产品基础信息（只读）
- 库存数量概览（只读）
- 今日待处理订单（只读）
- 最近使用的标签模板（可离线打印）

### 4.6 移动端详细设计

#### 4.5.1 移动端页面清单

| 页面 | 导航层级 | 优先级 | 对应角色 | 说明 |
|------|---------|--------|---------|------|
| **首页/Dashboard** | Tab首页 | P0 | 全部 | 今日待办数、库存预警数、待审批数 |
| **扫码出入库** | Tab首页入口 | P0 | 仓管员 | 摄像头扫码 → 匹配单据 → 确认操作 |
| **待办任务** | Tab首页 | P0 | 全部 | 待审批、待验收、待拣货列表 |
| **库存查询** | Tab首页 | P0 | 仓管/销售 | 扫码或搜索查看 SKU 库存分布 |
| **库存预警** | 二级页 | P0 | 采购/仓管 | 低于安全库存的原料/产品列表 |
| **审批操作** | 二级页 | P0 | 经理层 | 查看 → 通过/拒绝/转交 |
| **订单查看** | 二级页 | P1 | 销售 | 今日订单、订单状态跟踪 |
| **报工** | 二级页 | P1 | 生产工人 | 扫码工单二维码 → 选择工序 → 填报数量 |
| **简易报表** | 二级页 | P1 | 管理层 | 营收概览、库存金额、销售趋势图 |
| **通知中心** | Tab首页 | P0 | 全部 | 站内消息列表，点击跳转关联业务 |
| **个人中心** | Tab首页 | P0 | 全部 | 修改密码、切换仓库、消息设置 |

**导航结构（Bottom Tab）：**

```
┌──────────────────────────────────────────────────┐
│                    顶部标题栏                      │
├──────────────────────────────────────────────────┤
│                                                    │
│              页面内容区                             │
│                                                    │
├──────────┬──────────┬──────────┬──────────────────┤
│   首页    │   扫码   │   待办    │    我的           │
│  📊      │  📷      │  📋      │    👤             │
└──────────┴──────────┴──────────┴──────────────────┘
```

#### 4.5.2 原生模块桥接方案

##### 摄像头扫码

使用 `react-native-vision-camera` + 自定义 Frame Processor，或直接使用 `react-native-camera-kit`：

```typescript
// 扫码组件封装
function BarcodeScanner({ onScan }: { onScan: (barcode: string) => void }) {
  const cameraRef = useRef<Camera>(null);

  return (
    <Camera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      scanBarcode={true}
      onReadCode={(event) => {
        const barcode = event.nativeEvent.code;
        // 支持 CODE128 / EAN13 / QR / CODE39
        onScan(barcode);
      }}
    />
  );
}
```

**扫码业务流程：**

```
扫码 → 获取 barcode 字符串
    │
    ▼
查询 product_sku (WHERE barcode = ?)
    │
    ├── 找到 → 展示产品信息 + 可用操作
    │         ├── 出库单场景 → 匹配出库单明细 → 确认拣货
    │         ├── 入库单场景 → 匹配入库单明细 → 确认收货
    │         └── 查询场景 → 展示各仓库库存
    │
    └── 未找到 → 提示"未识别的条码"，可手动输入
```

##### 推送通知

| 平台 | 服务 | 集成方式 |
|------|------|---------|
| Android | 华为 HMS / 小米 / OPPO / vivo 推送 | `@react-native-community/push-notification-ios` + 厂商 SDK |
| iOS | APNs | `@react-native-community/push-notification-ios` |
| 统一 | 极光推送（JPush）或个推 | 一套 SDK 覆盖全平台，推荐 |

**推送消息类型：**

| 类型 | 触发场景 | 点击行为 |
|------|---------|---------|
| 库存预警 | 原料低于安全库存 | 跳转库存预警页 |
| 审批待办 | 新审批任务分配 | 跳转审批详情页 |
| 订单通知 | 电商新订单同步 | 跳转订单详情页 |
| 到货通知 | 采购单到货待验收 | 跳转到货验收页 |
| 系统通知 | 其他业务消息 | 跳转通知中心 |

#### 4.5.3 移动端离线场景处理

移动端网络不稳定场景（仓库WiFi死角、移动信号弱）的处理策略：

```
┌─────────────────────────────────────────────────────────┐
│                    网络状态管理器                         │
│                                                          │
│  NetInfo.addEventListener()                              │
│      │                                                    │
│      ├── 在线 → 所有请求走 HTTP API                      │
│      │                                                    │
│      └── 离线 → 切换离线模式                               │
│              │                                            │
│              ├── 读操作 → AsyncStorage / SQLite 本地缓存  │
│              │         （上次在线时的快照数据）              │
│              │                                            │
│              └── 写操作 → 存入离线操作队列                  │
│                        (SQLite offline_queue 表)           │
│                        │                                  │
│                        └── 网络恢复 → 按时间顺序重放队列    │
│                             │                              │
│                             ├── 成功 → 从队列删除          │
│                             └── 冲突 → 提示用户手动处理    │
└─────────────────────────────────────────────────────────┘
```

**离线操作队列表（SQLite 本地）：**

```sql
CREATE TABLE offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,          -- POST / PUT
    url TEXT NOT NULL,             -- /api/v1/inventory/outbound
    body TEXT NOT NULL,            -- JSON 请求体
    business_type TEXT,            -- 出库/入库/报工
    created_at TEXT NOT NULL,      -- ISO8601 时间戳
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'  -- pending / syncing / failed
);
```

**可离线执行的操作（有限集合）：**

| 操作 | 离线策略 | 冲突处理 |
|------|---------|---------|
| 扫码拣货 | 本地校验出库单明细 → 存队列 | 恢复后服务端校验库存，冲突则回滚并通知 |
| 扫码验收 | 本地记录实收数量 → 存队列 | 同上 |
| 报工 | 本地记录工时数量 → 存队列 | 恢复后校验工单状态，状态已变则丢弃 |
| 查看产品/库存 | 读本地缓存（只读快照） | 不涉及冲突 |

**不可离线执行的操作：** 创建订单、审批、支付、价格变更 — 直接提示"网络不可用"。

#### 4.5.4 移动端与 Web 端代码复用边界

```
@erp/shared (100% 复用)
├── api/          → Axios 请求层、拦截器、错误处理
├── types/        → TypeScript 类型定义
├── constants/    → 业务常量（状态枚举、平台编码等）
└── utils/        → 工具函数（格式化、计算等）

@erp/web (Web 独有)
├── Ant Design 组件
├── React Router 路由
└── 复杂表单/表格/图表页面

mobile (移动端独有)
├── Tamagui 组件
├── React Navigation (Stack + Tab)
├── 原生模块桥接（扫码、推送）
├── 简化的列表/详情页（非完整管理页面）
└── 离线队列管理
```

### 4.7 审批流程引擎实现（Flowable 集成）

#### 4.7.1 方案选型

采用 **Flowable 7.x** 作为审批流程引擎，而非自研。选择理由：

| 考量 | 说明 |
|------|------|
| 功能完整性 | 条件分支、会签/或签、超时、子流程等均开箱即用，无需逐个开发 |
| 可视化设计器 | 内置 BPMN Modeler，管理员可拖拽配置流程，无需开发前端设计器 |
| 审计追溯 | HistoryService 自动记录每个节点的进入/离开时间、变量快照、审批人信息 |
| 版本管理 | 流程定义修改后自动版本化，运行中实例按旧版本继续，新实例使用新版本 |
| 社区成熟度 | 大量生产验证，文档和社区资源丰富 |

**依赖配置：**

```xml
<!-- erp-common/erp-common-workflow/pom.xml -->
<dependency>
    <groupId>org.flowable</groupId>
    <artifactId>flowable-spring-boot-starter</artifactId>
    <version>7.1.0</version>
</dependency>
<dependency>
    <groupId>org.flowable</groupId>
    <artifactId>flowable-spring-boot-starter-rest</artifactId>
    <version>7.1.0</version>
</dependency>
```

**application.yml 配置：**

```yaml
flowable:
  database-schema-update: true        # 首次启动自动建表（约30张 ACT_* 表）
  history-level: full                 # 记录全部历史（含变量、表单属性）
  async-executor-activate: true       # 启用异步执行器（定时器、异步节点需要）
  process-definition-location-prefix: classpath*:/processes/
```

#### 4.7.2 架构分层

```
┌──────────────────────────────────────────────────────────┐
│  业务模块 (PurchaseOrderService / PriceService / ...)     │
│       │                                                   │
│       │ 调用                                              │
│       ▼                                                   │
│  ApprovalFacade (薄封装层，业务ID ↔ Flowable桥接)         │
│  ├── startProcess(businessType, businessId, variables)    │
│  ├── approve(taskId, userId, comment)                     │
│  ├── reject(taskId, userId, comment)                      │
│  ├── delegateTask(taskId, fromUserId, toUserId)           │
│  ├── withdraw(processInstanceId, initiatorId)             │
│  ├── getMyPendingTasks(userId, pageNum, pageSize)         │
│  └── getApprovalHistory(businessType, businessId)         │
│       │                                                   │
│       │ 委托                                              │
│       ▼                                                   │
│  Flowable Engine                                          │
│  ├── RuntimeService       → 启动流程、管理变量            │
│  ├── TaskService          → 签收、完成、转交任务          │
│  ├── HistoryService       → 查询历史任务和变量            │
│  ├── RepositoryService    → 管理流程定义                  │
│  └── ManagementService    → 引擎管理操作                  │
│       │                                                   │
│       │ 回调                                              │
│       ▼                                                   │
│  FlowableListeners → NotificationService                  │
│  ├── TaskAssigneeListener  → 任务创建时通知审批人          │
│  ├── ProcessEndListener    → 流程结束时回调业务模块        │
│  └── TimerListener         → 超时催办通知                  │
└──────────────────────────────────────────────────────────┘
```

#### 4.7.3 流程定义方式

流程以 BPMN 2.0 XML 文件定义，放入 `erp-admin/src/main/resources/processes/` 目录。

**采购单审批流程示例（purchase_order_approval.bpmn20.xml 关键结构）：**

```xml
<process id="purchase_order_approval" name="采购单审批" isExecutable="true">

  <!-- 开始事件 -->
  <startEvent id="start" name="提交采购单"/>

  <!-- 排他网关：按金额分支 -->
  <exclusiveGateway id="amountGateway" name="金额判断"/>

  <!-- 小额：仅采购经理 -->
  <sequenceFlow sourceRef="amountGateway" targetRef="pmApprove_small">
    <conditionExpression xsi:type="tFormalExpression">
      <![CDATA[${purchaseOrder.totalAmount < 10000}]]>
    </conditionExpression>
  </sequenceFlow>

  <!-- 中额：采购经理 → 总经理 -->
  <sequenceFlow sourceRef="amountGateway" targetRef="pmApprove">
    <conditionExpression xsi:type="tFormalExpression">
      <![CDATA[${purchaseOrder.totalAmount >= 10000 && purchaseOrder.totalAmount < 100000}]]>
    </conditionExpression>
  </sequenceFlow>

  <!-- 大额：采购经理 → 总经理 → 董事长 -->
  <sequenceFlow sourceRef="amountGateway" targetRef="pmApprove_large">
    <conditionExpression xsi:type="tFormalExpression">
      <![CDATA[${purchaseOrder.totalAmount >= 100000}]]>
    </conditionExpression>
  </sequenceFlow>

  <!-- 审批任务节点 -->
  <userTask id="pmApprove_small" name="采购经理审批"
            flowable:candidateGroups="purchase_manager"/>

  <userTask id="pmApprove" name="采购经理审批"
            flowable:candidateGroups="purchase_manager"/>

  <userTask id="gmApprove" name="总经理审批"
            flowable:candidateGroups="general_manager"/>

  <userTask id="pmApprove_large" name="采购经理审批"
            flowable:candidateGroups="purchase_manager"/>

  <userTask id="gmApprove_large" name="总经理审批"
            flowable:candidateGroups="general_manager"/>

  <userTask id="chairmanApprove" name="董事长审批"
            flowable:assignee="${chairmanUserId}"/>

  <!-- 各任务节点附加边界定时器（超时催办） -->
  <boundaryEvent id="pmTimer" attachedToRef="pmApprove" cancelActivity="false">
    <timerEventDefinition>
      <timeDuration>PT24H</timeDuration>  <!-- 24小时 -->
    </timerEventDefinition>
  </boundaryEvent>
  <sequenceFlow sourceRef="pmTimer" targetRef="reminderNotification"/>

  <serviceTask id="reminderNotification" name="发送催办通知"
               flowable:delegateExpression="${approvalReminderDelegate}"/>

  <!-- 排他网关：审批结果 -->
  <exclusiveGateway id="resultGateway" name="审批结果"/>

  <!-- 结束事件 -->
  <endEvent id="endApproved" name="审批通过"/>
  <endEvent id="endRejected" name="审批拒绝"/>

  <!-- 连线省略，完整定义参见 BPMN 文件 -->
</process>
```

**UEL 表达式中可访问的变量：**

| 变量 | 类型 | 来源 |
|------|------|------|
| `purchaseOrder` | 业务DTO | 启动流程时传入 |
| `initiatorId` | String | 发起人UUID |
| `chairmanUserId` | String | 业务层在启动时计算传入 |
| Spring Bean | 直接调用 | 如 `${customerService.getCreditLimit(customerId)}` |

#### 4.7.4 会签与或签实现

使用 BPMN 多实例任务（Multi-Instance Activity）：

**会签（所有人通过才算通过）：**

```xml
<userTask id="countersign" name="会签审批"
          flowable:candidateGroups="${approverGroup}">
  <multiInstanceLoopCharacteristics isSequential="false"
      flowable:collection="${approverUserIds}" flowable:elementVariable="approver">
    <!-- 完成条件：所有人完成 且 无人拒绝 -->
    <completionCondition>
      <![CDATA[${nrOfCompletedInstances == nrOfInstances
                && !rejectCounter.signalled}]]>
    </completionCondition>
  </multiInstanceLoopCharacteristics>
</userTask>
```

**或签（任一人通过即通过）：**

```xml
<userTask id="orSign" name="或签审批"
          flowable:candidateGroups="${approverGroup}">
  <multiInstanceLoopCharacteristics isSequential="false"
      flowable:collection="${approverUserIds}" flowable:elementVariable="approver">
    <!-- 完成条件：任一人通过 即结束 -->
    <completionCondition>
      <![CDATA[${nrOfCompletedInstances >= 1
                && approvedCounter.signalled}]]>
    </completionCondition>
  </multiInstanceLoopCharacteristics>
</userTask>
```

| 模式 | isSequential | 完成条件 | 拒绝条件 |
|------|-------------|---------|---------|
| 普通审批 | 不使用多实例 | 单人通过 | 单人拒绝 |
| 会签 | false | 全部通过 | 任一拒绝（通过 `rejectCounter` 信号中断） |
| 或签 | false | 任一通过 | 全部拒绝 |

#### 4.7.5 ApprovalFacade 封装层

业务模块不直接操作 Flowable API，统一通过 `ApprovalFacade` 调用：

```java
@Service
public class ApprovalFacade {

    @Autowired private RuntimeService runtimeService;
    @Autowired private TaskService taskService;
    @Autowired private HistoryService historyService;
    @Autowired private BizProcessBindingMapper bindingMapper;
    @Autowired private NotificationService notificationService;
    @Autowired private Map<String, ApprovalCallback> callbackMap;

    /**
     * 发起审批流程
     */
    @Transactional
    public String startProcess(String businessType, UUID businessId,
                               String businessCode, String title,
                               String processDefinitionKey,
                               Map<String, Object> variables) {
        // 1. 启动 Flowable 流程实例
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(
            processDefinitionKey, businessId.toString(), variables);

        // 2. 创建业务关联记录
        BizProcessBinding binding = new BizProcessBinding();
        binding.setBusinessType(businessType);
        binding.setBusinessId(businessId);
        binding.setBusinessCode(businessCode);
        binding.setProcessDefinitionKey(processDefinitionKey);
        binding.setProcessInstanceId(instance.getId());
        binding.setTitle(title);
        binding.setInitiatorId(SecurityUtils.getCurrentUserId());
        bindingMapper.insert(binding);

        return instance.getId();
    }

    /**
     * 通过审批
     */
    @Transactional
    public void approve(String taskId, UUID userId, String comment) {
        Task task = taskService.createTaskQuery().taskId(taskId)
            .taskAssignee(userId.toString()).singleResult();
        if (task == null) {
            throw new BusinessException(10002, "无权操作此任务或任务不存在");
        }
        taskService.addComment(taskId, task.getProcessInstanceId(), "APPROVE", comment);
        taskService.complete(taskId);
    }

    /**
     * 拒绝审批
     */
    @Transactional
    public void reject(String taskId, UUID userId, String comment) {
        Task task = taskService.createTaskQuery().taskId(taskId)
            .taskAssignee(userId.toString()).singleResult();
        taskService.addComment(taskId, task.getProcessInstanceId(), "REJECT", comment);
        // 设置流程变量标记拒绝，供排他网关判断
        runtimeService.setVariable(task.getProcessInstanceId(), "approved", false);
        runtimeService.setVariable(task.getProcessInstanceId(), "rejectReason", comment);
        taskService.complete(taskId);
    }

    /**
     * 转交任务
     */
    public void delegateTask(String taskId, UUID fromUserId, UUID toUserId) {
        taskService.delegateTask(taskId, toUserId.toString());
    }

    /**
     * 撤回流程（仅发起人，且当前任务未被处理时）
     */
    @Transactional
    public void withdraw(String processInstanceId, UUID initiatorId) {
        BizProcessBinding binding = bindingMapper.findByProcessInstanceId(processInstanceId);
        if (!binding.getInitiatorId().equals(initiatorId)) {
            throw new BusinessException(10002, "仅发起人可撤回");
        }
        runtimeService.deleteProcessInstance(processInstanceId, "发起人撤回");
        binding.setStatus(3);
        bindingMapper.updateById(binding);
    }

    /**
     * 查询我的待办任务
     */
    public Page<PendingTaskVO> getMyPendingTasks(UUID userId, int pageNum, int pageSize) {
        TaskQuery query = taskService.createTaskQuery()
            .taskCandidateOrAssigned(userId.toString())
            .orderByTaskCreateTime().desc();
        long total = query.count();
        List<Task> tasks = query.listPage((pageNum - 1) * pageSize, pageSize);

        List<PendingTaskVO> result = tasks.stream().map(task -> {
            BizProcessBinding binding = bindingMapper.findByProcessInstanceId(
                task.getProcessInstanceId());
            return new PendingTaskVO(
                task.getId(),
                task.getName(),
                task.getCreateTime(),
                binding.getBusinessType(),
                binding.getBusinessId(),
                binding.getBusinessCode(),
                binding.getTitle()
            );
        }).collect(Collectors.toList());

        return new Page<>(result, total, pageNum, pageSize);
    }

    /**
     * 查询审批历史
     */
    public List<ApprovalHistoryVO> getApprovalHistory(String businessType, UUID businessId) {
        BizProcessBinding binding = bindingMapper.findByBusiness(businessType, businessId);
        if (binding == null) return Collections.emptyList();

        List<HistoricTaskInstance> tasks = historyService.createHistoricTaskInstanceQuery()
            .processInstanceId(binding.getProcessInstanceId())
            .orderByHistoricTaskInstanceEndTime().asc()
            .list();

        return tasks.stream().map(t -> {
            List<Comment> comments = taskService.getTaskComments(t.getId());
            return new ApprovalHistoryVO(
                t.getName(),
                t.getAssignee(),
                t.getStartTime(),
                t.getEndTime(),
                comments.isEmpty() ? null : comments.get(0).getFullMessage(),
                t.getEndTime() != null ? "completed" : "pending"
            );
        }).collect(Collectors.toList());
    }
}
```

#### 4.7.6 流程事件监听与业务回调

通过 Flowable Listener 实现审批结果回调到业务模块：

```java
/**
 * 流程结束监听器 — 根据审批结果回调业务模块
 */
@Component("processEndListener")
public class ProcessEndListener implements ExecutionListener {

    @Autowired private Map<String, ApprovalCallback> callbackMap;
    @Autowired private BizProcessBindingMapper bindingMapper;

    @Override
    public void notify(DelegateExecution execution) {
        String processInstanceId = execution.getProcessInstanceId();
        BizProcessBinding binding = bindingMapper.findByProcessInstanceId(processInstanceId);

        Boolean approved = (Boolean) execution.getVariable("approved");
        if (approved == null) approved = true; // 正常走完流程视为通过

        ApprovalCallback callback = callbackMap.get(binding.getBusinessType());
        if (callback != null) {
            if (approved) {
                binding.setStatus(1);
                callback.onApproved(binding.getBusinessId());
            } else {
                binding.setStatus(2);
                String reason = (String) execution.getVariable("rejectReason");
                callback.onRejected(binding.getBusinessId(), reason);
            }
        }
        bindingMapper.updateById(binding);
    }
}

/**
 * 任务分配监听器 — 通知审批人有新任务
 */
@Component("taskAssigneeListener")
public class TaskAssigneeListener implements TaskListener {

    @Autowired private NotificationService notificationService;
    @Autowired private BizProcessBindingMapper bindingMapper;

    @Override
    public void notify(DelegateTask delegateTask) {
        BizProcessBinding binding = bindingMapper.findByProcessInstanceId(
            delegateTask.getProcessInstanceId());
        UUID assigneeId = UUID.fromString(delegateTask.getAssignee());
        notificationService.send(
            assigneeId,
            "approval_task",
            "您有一条待审批任务: " + binding.getTitle(),
            Map.of("businessType", binding.getBusinessType(),
                   "businessId", binding.getBusinessId().toString(),
                   "taskId", delegateTask.getId())
        );
    }
}
```

**业务模块注册回调：**

```java
@Component("purchase_order")   // Bean 名称 = businessType
public class PurchaseOrderApprovalCallback implements ApprovalCallback {

    @Autowired private PurchaseOrderMapper purchaseOrderMapper;
    @Autowired private NotificationService notificationService;

    @Override
    public void onApproved(UUID businessId) {
        purchaseOrderMapper.updateStatus(businessId, 2); // 已审批
    }

    @Override
    public void onRejected(UUID businessId, String reason) {
        purchaseOrderMapper.updateStatus(businessId, 0); // 回到草稿
        UUID createdBy = purchaseOrderMapper.getCreatedBy(businessId);
        notificationService.send(createdBy, "approval_result",
            "采购单审批被拒绝: " + reason, null);
    }
}
```

#### 4.7.7 超时处理

使用 BPMN 边界定时器事件（Boundary Timer Event），无需自研定时任务：

- **催办提醒**：`cancelActivity="false"`（不中断任务），超时后触发 `ServiceTask` 发送通知，任务继续等待
- **自动通过**：`cancelActivity="true"`（中断任务），超时后自动完成当前任务并设 `approved=true`
- **自动拒绝**：同上，但设 `approved=false`

```xml
<!-- 24小时未审批则催办 -->
<boundaryEvent id="pmTimer" attachedToRef="pmApprove" cancelActivity="false">
  <timerEventDefinition>
    <timeDuration>PT24H</timeDuration>
  </timerEventDefinition>
</boundaryEvent>
<sequenceFlow sourceRef="pmTimer" targetRef="sendReminder"/>

<!-- 72小时未审批则自动通过 -->
<boundaryEvent id="pmAutoApprove" attachedToRef="pmApprove" cancelActivity="true">
  <timerEventDefinition>
    <timeDuration>PT72H</timeDuration>
  </timerEventDefinition>
</boundaryEvent>
<sequenceFlow sourceRef="pmAutoApprove" targetRef="autoApproveService"/>
```

#### 4.7.8 转交与加签

使用 Flowable 内置能力，无需自研：

| 操作 | Flowable API | 说明 |
|------|-------------|------|
| 转交 | `TaskService.delegateTask(taskId, newUserId)` | 原审批人变为"委派人"，新审批人处理完后回到原审批人确认 |
| 加签（前加签） | `RuntimeService.addMultiInstanceExecution()` | 在多实例任务中动态增加一个执行实例 |
| 减签 | `RuntimeService.deleteMultiInstanceExecution()` | 动态减少一个执行实例 |
| 拣货/认领 | `TaskService.claim(taskId, userId)` | 候选组任务变为个人任务 |

#### 4.7.9 业务模块集成模板

各业务模块集成审批的标准步骤：

```java
// ====== 1. 业务 Service 中发起审批 ======
@Service
public class PurchaseOrderService {

    @Autowired private ApprovalFacade approvalFacade;

    @Transactional
    public void submitOrder(UUID orderId) {
        PurchaseOrder order = getById(orderId);
        order.setStatus(1); // 待审批
        updateById(order);

        // 构造流程变量（供 BPMN 表达式使用）
        Map<String, Object> variables = new HashMap<>();
        variables.put("purchaseOrder", order);  // UEL 可访问全部字段
        variables.put("initiatorId", SecurityUtils.getCurrentUserId().toString());

        approvalFacade.startProcess(
            "purchase_order",
            order.getId(),
            order.getCode(),
            "采购单审批: " + order.getCode() + " - " + order.getSupplierName(),
            "purchase_order_approval",   // BPMN process id
            variables
        );
    }
}

// ====== 2. 注册审批回调（Bean名称必须等于 businessType）======
@Component("purchase_order")
public class PurchaseOrderApprovalCallback implements ApprovalCallback {
    // 见 4.5.6 节
}

// ====== 3. 前端审批操作 ======
// 前端调用: POST /api/v1/approval/tasks/{taskId}/approve
// 前端调用: POST /api/v1/approval/tasks/{taskId}/reject
// 这些接口由通用 ApprovalController 提供，所有业务模块共用
```

#### 4.7.10 审批管理接口

提供统一的审批操作 API，所有业务模块共用：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/approval/tasks/pending | 我的待办列表 |
| GET | /api/v1/approval/tasks/history | 我的已办列表 |
| POST | /api/v1/approval/tasks/{taskId}/approve | 通过 |
| POST | /api/v1/approval/tasks/{taskId}/reject | 拒绝 |
| POST | /api/v1/approval/tasks/{taskId}/delegate | 转交 |
| POST | /api/v1/approval/tasks/{taskId}/claim | 认领（候选组任务） |
| POST | /api/v1/approval/process/{processInstanceId}/withdraw | 撤回 |
| GET | /api/v1/approval/{businessType}/{businessId}/history | 审批历史 |

**审批操作请求/响应示例：**

**我的待办 GET /api/v1/approval/tasks/pending**
```json
// Query: ?pageNum=1&pageSize=20

// Response 200
{
  "code": 200,
  "data": {
    "records": [
      {
        "taskId": "task-uuid-001",
        "taskName": "采购经理审批",
        "processInstanceId": "pi-uuid-001",
        "businessType": "purchase_order",
        "businessId": "uuid-of-po",
        "businessCode": "PO-20260520-0001",
        "title": "采购单审批: PO-20260520-0001 - 某某钢材公司",
        "createTime": "2026-05-20T10:30:00+08:00",
        "dueDate": null
      }
    ],
    "total": 5,
    "pageNum": 1,
    "pageSize": 20,
    "pages": 1
  }
}
```

**通过审批 POST /api/v1/approval/tasks/{taskId}/approve**
```json
// Request
{
  "comment": "价格合理，同意采购"
}

// Response 200
{
  "code": 200,
  "data": null,
  "message": "审批通过"
}
```

**审批历史 GET /api/v1/approval/purchase_order/{businessId}/history**
```json
// Response 200
{
  "code": 200,
  "data": [
    {
      "taskName": "采购经理审批",
      "assigneeName": "李经理",
      "startTime": "2026-05-20T10:30:00+08:00",
      "endTime": "2026-05-20T14:15:00+08:00",
      "comment": "价格合理，同意采购",
      "status": "completed"
    },
    {
      "taskName": "总经理审批",
      "assigneeName": null,
      "startTime": "2026-05-20T14:15:01+08:00",
      "endTime": null,
      "comment": null,
      "status": "pending"
    }
  ]
}
```

#### 4.7.11 流程设计器集成

提供两种方案，按阶段选择：

| 阶段 | 方案 | 说明 |
|------|------|------|
| MVP（M1-M3） | 静态 BPMN 文件 | 开发阶段直接编写 XML，放入 `resources/processes/`，够用 |
| 正式版（M4+） | 嵌入 bpmn-js 设计器 | 前端集成 [bpmn-io/bpmn-js](https://github.com/bpmn-io/bpmn-js)，管理员可在浏览器中可视化编辑流程，保存后通过 Flowable RepositoryService 部署 |

MVP 阶段需预置的流程定义文件：

```
resources/processes/
├── purchase_order_approval.bpmn20.xml    # 采购单审批
├── price_strategy_approval.bpmn20.xml    # 价格审批
├── return_order_approval.bpmn20.xml      # 退货审批
├── inventory_check_approval.bpmn20.xml   # 盘点审批
└── scrap_approval.bpmn20.xml             # 报废审批
```

#### 4.7.12 与自研方案的对比

| 维度 | 自研方案 | Flowable 方案 |
|------|---------|--------------|
| 业务表数量 | 4 张自建表 | 1 张自建表 + Flowable 约 30 张 ACT_* 表 |
| 开发工作量 | 封装层 ~2000 行 + 前端配置页 | 封装层 ~500 行，无需配置页 |
| 可视化设计器 | 需自行开发 | 内置 bpmn-js，直接嵌入 |
| 条件表达式 | 自定义 JSON 运算符（12种） | UEL + Spring Bean（无限扩展） |
| 会签/或签 | 自行实现状态机 | 多实例任务 + completionCondition |
| 超时处理 | 自研定时任务扫描 | Boundary Timer Event（引擎内置） |
| 转交/加签 | 自行实现 | TaskService API 原生支持 |
| 流程版本管理 | 手动 version 字段 | 自动版本化，支持迁移策略 |
| 审计追溯 | 单表 approval_record | HistoryService 全量快照 |
| 学习成本 | 低 | 中（需理解 BPMN 2.0 概念） |
| 额外依赖 | 无 | flowable-spring-boot-starter (~15MB) |

---

## 五、开发规范

### 5.1 代码规范

**后端（Java）：**
- 遵循阿里巴巴 Java 开发手册
- 使用 Checkstyle + SpotBugs 静态检查
- 方法长度不超过 80 行
- 类长度不超过 500 行
- 全部对外 API 编写 Javadoc

**前端（TypeScript）：**
- 遵循 ESLint + Prettier 规则
- 组件使用函数式 + Hooks
- Props 全部定义 TypeScript 接口
- 文件名：组件用 PascalCase，工具用 camelCase

### 5.2 Git 规范

**分支策略：**
```
main ──── 生产分支
  │
  ├── develop ──── 开发主分支
  │     │
  │     ├── feature/product-module ──── 功能分支
  │     ├── feature/inventory-module
  │     └── ...
  │
  ├── release/v1.0.0 ──── 发布分支
  └── hotfix/fix-xxx ──── 紧急修复
```

**Commit 规范：**
```
feat(product): 添加产品BOM管理功能
fix(inventory): 修复库存扣减并发问题
docs(api): 更新产品接口文档
refactor(auth): 重构JWT验证逻辑
test(sales): 添加订单创建单元测试
```

### 5.3 测试策略

| 层级 | 工具 | 覆盖率目标 | 说明 |
|------|------|-----------|------|
| 单元测试 | JUnit 5 + Mockito | > 70% | Service 层逻辑 |
| 集成测试 | Testcontainers | 核心流程 | 数据库 + Redis 真实环境 |
| API 测试 | Spring MockMvc | 全部接口 | 请求响应验证 |
| 前端测试 | Vitest + Testing Library | > 60% | 组件 + Hooks |
| E2E 测试 | Playwright | 核心流程 | 端到端场景 |

### 5.4 AI 编程工具使用策略

| 场景 | 工具 | 使用方式 |
|------|------|---------|
| CRUD 代码生成 | Claude Code / Codex | 提供表结构 → 生成 Controller/Service/Mapper |
| React 页面生成 | Claude Code | 描述功能 → 生成 Ant Design 表单/表格页面 |
| SQL 迁移脚本 | Claude Code | 描述需求 → 生成 Flyway 迁移脚本 |
| 单元测试 | Codex | 提供被测代码 → 生成测试用例 |
| 类型定义 | Claude Code | 提供 API 文档 → 生成 TypeScript 类型 |
| Bug 修复 | Claude Code | 提供错误信息 → 分析并修复 |

**注意事项：**
- AI 生成的代码必须人工 Code Review
- 涉及安全（认证、权限、加密）的代码需重点审查
- 生成的 SQL 需在测试环境验证性能

### 5.5 前端路由与权限映射

#### 5.5.1 路由表定义

```
路径                          页面组件                          权限码（code）
────────────────────────────────────────────────────────────────────────────────
/                             Dashboard（按角色渲染）           -

# 系统管理
/system/users                UserList                          system:user:list
/system/users/create         UserForm                          system:user:create
/system/users/:id/edit       UserForm                          system:user:update
/system/roles                RoleList                          system:role:list
/system/roles/:id/permission RolePermission                   system:role:update
/system/departments          DepartmentTree                    system:dept:list
/system/dict                 DictTypeList                      system:dict:list
/system/logs                 OperationLogList                  system:log:list

# 产品管理
/product/products            ProductList                       product:list
/product/products/create     ProductForm                       product:create
/product/products/:id        ProductDetail                     product:detail
/product/products/:id/edit   ProductForm                       product:update
/product/categories          CategoryManagement                product:category:list
/product/label-templates     LabelTemplateList                 product:label:list
/product/label-templates/:id LabelTemplateDesigner             product:label:update
/product/labels/print        LabelPrint                        product:label:print

# 原料管理
/material/materials          MaterialList                      material:list
/material/materials/create   MaterialForm                      material:create
/material/suppliers          SupplierList                      material:supplier:list
/material/suppliers/:id      SupplierDetail                    material:supplier:detail

# 采购管理
/purchase/orders             PurchaseOrderList                 purchase:list
/purchase/orders/create      PurchaseOrderForm                 purchase:create
/purchase/orders/:id         PurchaseOrderDetail               purchase:detail
/purchase/receipts           PurchaseReceiptList               purchase:receipt:list

# 库存管理
/inventory/stocks            StockList                         inventory:stock:list
/inventory/inbound           InboundOrder                      inventory:inbound
/inventory/outbound          OutboundOrder                     inventory:outbound
/inventory/transfers         TransferList                      inventory:transfer:list
/inventory/checks            CheckList                         inventory:check:list
/inventory/checks/:id        CheckDetail                       inventory:check:detail
/inventory/transactions      TransactionList                   inventory:transaction:list
/inventory/alerts            AlertList                         inventory:alert:list

# 销售管理
/sales/customers             CustomerList                      sales:customer:list
/sales/orders                SaleOrderList                     sales:order:list
/sales/orders/create         SaleOrderForm                     sales:order:create
/sales/orders/:id            SaleOrderDetail                   sales:order:detail
/sales/returns               ReturnList                        sales:return:list
/sales/reports               SalesReport                       sales:report

# 生产管理
/production/orders           ProductionOrderList               production:list
/production/orders/:id       ProductionOrderDetail             production:detail
/production/process-routes   ProcessRouteList                  production:route:list
/production/mrp              MrpDashboard                      production:mrp

# 财务管理
/finance/invoices            InvoiceList                       finance:invoice:list
/finance/invoices/create     InvoiceForm                       finance:invoice:create
/finance/invoices/:id        InvoiceDetail                     finance:invoice:detail
/finance/tax                 TaxSummary                        finance:tax:list
/finance/prices              PriceStrategyList                 finance:price:list
/finance/prices/create       PriceStrategyForm                 finance:price:create

# 电商集成
/integration/shops           ShopList                          integration:shop:list
/integration/sync-logs       SyncLogList                       integration:log:list

# 报表
/reports/dashboard           Dashboard                         -
/reports/inventory           InventoryReport                   report:inventory
/reports/purchase            PurchaseReport                    report:purchase
/reports/finance             FinanceReport                     report:finance

# 审批
/approval/pending            ApprovalPending                   approval:pending
/approval/history            ApprovalHistory                   approval:history
```

#### 5.5.2 权限模型

```
sys_permission 表中的数据定义了三级结构：

目录（type=1）── 菜单（type=2）── 按钮（type=3）

示例：
  产品管理(目录) ── 产品列表(菜单) ── 创建产品(按钮)
                                    ── 编辑产品(按钮)
                                    ── 删除产品(按钮)
                                    ── 查看成本价(按钮)
```

**按钮级权限码定义规范：**

```
{module}:{resource}:{action}

module   = 业务模块名 (system/product/inventory/sales/...)
resource = 资源名 (user/role/product/stock/order/invoice/...)
action   = 操作类型 (list/detail/create/update/delete/print/export/import/approve)

示例：
  product:list          → 产品列表页面可见性
  product:create        → 创建产品按钮
  product:detail        → 产品详情页（含成本价字段）
  product:export        → 导出按钮
  product:label:print   → 标签打印按钮
  inventory:stock:cost  → 查看库存成本价（字段级权限）
```

#### 5.5.3 前端权限控制实现

**路由守卫（React Router）：**

```typescript
// 路由配置
const routes: RouteConfig[] = [
  { path: '/product/products', component: ProductList,
    permission: 'product:list' },
  { path: '/product/products/create', component: ProductForm,
    permission: 'product:create' },
  // ...
];

// 路由守卫：无权限则跳转 403
function AuthGuard({ children, permission }: { children: ReactNode; permission: string }) {
  const { permissions } = useAuthStore();
  if (!permissions.includes(permission)) {
    return <Forbidden />;
  }
  return <>{children}</>;
}
```

**按钮级控制：**

```typescript
// 权限指令组件
<Auth code="product:create">
  <Button type="primary" onClick={handleCreate}>创建产品</Button>
</Auth>

<Auth code="product:export">
  <Button onClick={handleExport}>导出</Button>
</Auth>
```

**字段级控制（如成本价）：**

```typescript
// 表格列配置
const columns = [
  { title: '产品名称', dataIndex: 'name' },
  { title: '售价', dataIndex: 'price' },
  {
    title: '成本价',
    dataIndex: 'costPrice',
    hidden: !hasPermission('product:cost'),  // 无权限则隐藏整列
  },
];
```

---

## 六、开发计划与里程碑

### 6.1 团队假设

- 后端开发：2 人
- 前端开发：2 人
- 全栈/负责人：1 人
- 合计 5 人，利用 AI 工具加速

### 6.2 阶段规划

#### 第一阶段：基础架构 + 核心骨架（第 1-3 周）

| 任务 | 负责 | 产出 |
|------|------|------|
| Spring Boot 项目初始化 | 后端 | Maven 多模块骨架 |
| PostgreSQL 建表 (系统+产品) | 后端 | Flyway 脚本 |
| 认证授权 (JWT + RBAC) | 后端 | 登录/权限 API |
| React 项目初始化 (Monorepo) | 前端 | pnpm workspace 骨架 |
| 登录页 + 布局框架 | 前端 | 管理后台壳 |
| 系统管理 (用户/角色/权限/字典) | 全栈 | 完整 CRUD |
| Docker Compose 环境 | 全栈 | 一键启动开发环境 |

**里程碑 M1：** 系统可登录，权限可配置，字典可管理。

#### 第二阶段：产品 + 原料 + 库存（第 4-7 周）

| 任务 | 负责 | 产出 |
|------|------|------|
| 产品 CRUD + 分类 | 后端 | 产品 API |
| 产品 SKU + BOM | 后端 | SKU/BOM API |
| 包装规格 + 标签模板 | 后端 | 包装/标签 API |
| 原料 + 供应商 CRUD | 后端 | 原料 API |
| 仓库/货位管理 | 后端 | 仓库 API |
| 入库/出库/库存查询 | 后端 | 库存核心 API |
| 产品管理页面 | 前端 | 列表/详情/SKU 页面 |
| 库存管理页面 | 前端 | 出入库/查询页面 |
| Tauri 桌面端壳搭建 | 前端 | 基本运行 |
| 标签打印 (Tauri 本地) | 全栈 | 打印功能可用 |

**里程碑 M2：** 产品可管理，库存可出入库，桌面端可打印标签。

#### 第三阶段：销售 + 采购 + 电商（第 8-12 周）

| 任务 | 负责 | 产出 |
|------|------|------|
| 客户管理 | 后端 | 客户 API |
| 销售订单全流程 | 后端 | 订单 API |
| 采购单全流程 | 后端 | 采购 API |
| 电商平台对接 (淘宝/京东) | 后端 | 集成 API |
| RabbitMQ 订单队列 | 后端 | 异步消费 |
| 销售管理页面 | 前端 | 订单列表/详情 |
| 采购管理页面 | 前端 | 采购流程页面 |
| 电商店铺管理页面 | 前端 | 授权/同步配置 |

**里程碑 M3：** 销售采购完整流程，至少一个电商平台可同步订单。

#### 第四阶段：财务 + 价格（第 13-16 周）

| 任务 | 负责 | 产出 |
|------|------|------|
| 价格策略管理 | 后端 | 价格 API |
| 发票管理 (进项/销项) | 后端 | 发票 API |
| 报税自动计算 | 后端 | 报税 API |
| 审批流程引擎 | 后端 | 审批 API |
| 财务管理页面 | 前端 | 发票/报税页面 |
| 价格管理页面 | 前端 | 价格策略配置 |
| 报表 (销售/库存/财务) | 全栈 | ECharts 报表页 |

**里程碑 M4：** 财务闭环（采购→进项→销售→销项→报税），核心报表可用。

#### 第五阶段：生产 + 移动端 + 优化（第 17-20 周）

| 任务 | 负责 | 产出 |
|------|------|------|
| 工艺路线 + 工单 | 后端 | 生产 API |
| MRP 运算 | 后端 | MRP 计算服务 |
| React Native 项目搭建 | 前端 | 移动端骨架 |
| 移动端核心页面 | 前端 | 扫码/审批/报表 |
| 拼多多/抖音平台对接 | 后端 | 扩展集成 |
| 性能优化 | 全栈 | 压测 + 调优 |
| 安全加固 | 全栈 | 安全扫描修复 |
| E2E 测试 | 全栈 | 核心流程自动化测试 |

**里程碑 M5：** 全部功能完成，移动端可用，性能达标。

### 6.3 交付物清单

| 交付物 | 说明 |
|--------|------|
| 后端服务 (Docker 镜像) | 可直接部署运行 |
| Web 端 (构建产物) | Nginx 部署 |
| 桌面端安装包 | Windows .msi + macOS .dmg |
| 移动端安装包 | Android .apk + iOS TestFlight |
| API 文档 | Springdoc OpenAPI (在线) |
| 数据库脚本 | Flyway 迁移脚本全集 |
| 部署文档 | Docker Compose + 运维手册 |
| 用户操作手册 | 各角色操作指南 |

---

## 七、环境配置

### 7.1 开发环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| JDK | 17 | 后端运行 |
| Node.js | 20 LTS | 前端构建 |
| pnpm | 8+ | 包管理 |
| Rust | 1.70+ | Tauri 编译 |
| Docker Desktop | 最新 | 本地环境 |
| IntelliJ IDEA | 最新 | 后端IDE |
| VS Code / Cursor | 最新 | 前端IDE |

### 7.2 Docker Compose 开发环境

```yaml
# docker-compose.dev.yml 概要
services:
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: erp_dev
      POSTGRES_USER: erp
      POSTGRES_PASSWORD: erp_dev_123
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3.12-management
    ports: ["5672:5672", "15672:15672"]

  rustfs:
    image: rustfs/rustfs
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"
```

### 7.3 配置文件管理

```
erp-server/erp-admin/src/main/resources/
├── application.yml              # 公共配置
├── application-dev.yml          # 开发环境
├── application-staging.yml      # 预发布
└── application-prod.yml         # 生产环境（敏感配置走环境变量）
```

敏感配置（数据库密码、API Key）通过环境变量注入，不入代码库。

---

## 八、风险登记与应对

| ID | 风险描述 | 概率 | 影响 | 应对策略 | 负责人 |
|----|---------|------|------|---------|--------|
| R1 | 电商API授权流程复杂，对接周期超预期 | 高 | 中 | 提前申请开发者资质，第3周开始准备 | 后端 |
| R2 | Tauri 打印功能兼容性问题 | 中 | 中 | 第2周完成打印PoC，准备fallback方案 | 全栈 |
| R3 | 团队对 PostgreSQL 高级特性不熟悉 | 中 | 低 | 安排培训，简单场景先用基础特性 | 后端 |
| R4 | 电商大促期间订单量激增 | 低 | 高 | 提前压测，RabbitMQ削峰，限流降级 | 后端 |
| R5 | 移动端审核周期不可控 | 中 | 低 | 预留2周审核缓冲，准备热更新方案 | 前端 |
| R6 | 需求变更频繁 | 中 | 中 | 每阶段开始前需求冻结，变更走评审 | PM |
