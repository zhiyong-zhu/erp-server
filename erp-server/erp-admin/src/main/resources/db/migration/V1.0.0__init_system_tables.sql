-- =============================================
-- V1.0.0 系统管理表初始化
-- =============================================

-- 部门表
CREATE TABLE sys_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES sys_department(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    sort_order INTEGER DEFAULT 0,
    leader_id UUID,
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 用户表
CREATE TABLE sys_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    real_name VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    avatar VARCHAR(500),
    department_id UUID REFERENCES sys_department(id),
    status SMALLINT DEFAULT 1,
    last_login_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 角色表
CREATE TABLE sys_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    data_scope SMALLINT DEFAULT 1,
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 用户角色关联表
CREATE TABLE sys_user_role (
    user_id UUID NOT NULL REFERENCES sys_user(id),
    role_id UUID NOT NULL REFERENCES sys_role(id),
    PRIMARY KEY (user_id, role_id)
);

-- 权限/菜单表
CREATE TABLE sys_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES sys_permission(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type SMALLINT NOT NULL,
    path VARCHAR(200),
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 角色权限关联表
CREATE TABLE sys_role_permission (
    role_id UUID NOT NULL REFERENCES sys_role(id),
    permission_id UUID NOT NULL REFERENCES sys_permission(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 操作日志表（按月分区）
CREATE TABLE sys_operation_log (
    id BIGSERIAL,
    user_id UUID,
    username VARCHAR(50),
    module VARCHAR(50),
    action VARCHAR(50),
    description VARCHAR(500),
    method VARCHAR(10),
    request_url VARCHAR(200),
    request_params TEXT,
    response_code INTEGER,
    ip VARCHAR(50),
    duration BIGINT,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 数据字典类型表
CREATE TABLE sys_dict_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 数据字典数据表
CREATE TABLE sys_dict_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dict_type_code VARCHAR(50) NOT NULL REFERENCES sys_dict_type(code),
    label VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    css_class VARCHAR(100),
    status SMALLINT DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_sys_user_username ON sys_user(username);
CREATE INDEX idx_sys_user_department ON sys_user(department_id);
CREATE INDEX idx_sys_user_status ON sys_user(status);
CREATE INDEX idx_sys_department_parent ON sys_department(parent_id);
CREATE INDEX idx_sys_department_code ON sys_department(code);
CREATE INDEX idx_sys_permission_parent ON sys_permission(parent_id);
CREATE INDEX idx_sys_permission_code ON sys_permission(code);
CREATE INDEX idx_sys_operation_log_user ON sys_operation_log(user_id);
CREATE INDEX idx_sys_operation_log_module ON sys_operation_log(module);
CREATE INDEX idx_sys_dict_data_type ON sys_dict_data(dict_type_code);
