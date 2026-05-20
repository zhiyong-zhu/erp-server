# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **documentation-only** repository for a full-channel ERP (Enterprise Resource Planning) system targeting Chinese manufacturing/trade businesses. It contains three design documents (all in Chinese) that together define the complete system specification:

- `prd.md` — Product Requirements Document: business modules, user stories, acceptance criteria, business rules, state machines
- `tech-architecture.md` — Technical Architecture: system architecture, tech stack, deployment, security, observability
- `dev-design.md` — Development Design: database DDL, API endpoints, implementation plans, coding conventions, milestone schedule

## System Overview

The ERP covers the full business chain: Product → Material → Process → Procurement → Inventory → Pricing → Sales → Tax/Invoice → Employees, with e-commerce platform integration (Taobao/JD/Pinduoduo/Douyin). Three client platforms: Desktop (Tauri), Web (React SPA), Mobile (React Native).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.x, MyBatis-Plus 3.5+, PostgreSQL 15+, Redis 7, RabbitMQ 3.12+ |
| Web | React 18, TypeScript 5, Vite 5, Ant Design 5, Zustand, TanStack Query |
| Desktop | Tauri (Rust backend + shared React frontend) |
| Mobile | React Native, Tamagui |
| Frontend monorepo | pnpm workspace |
| Backend build | Maven multi-module |
| DB migrations | Flyway |
| Deployment | Docker Compose |

## Backend Module Structure

Maven multi-module by business domain:
- `erp-common` (core, security, mybatis, redis)
- `erp-system` (users, roles, permissions, dictionaries)
- `erp-product` (products, categories, BOM, packaging, labels)
- `erp-material` (raw materials, suppliers)
- `erp-inventory` (inbound, outbound, stocktaking, transfers)
- `erp-sales` (customers, orders, returns)
- `erp-purchase` (purchase orders, receipts, payables)
- `erp-production` (process routes, work orders, MRP)
- `erp-finance` (pricing, invoices, tax)
- `erp-hr` (employees, approvals)
- `erp-integration` (e-commerce, logistics, invoice platforms)
- `erp-admin` (aggregation/startup module)

## Key Architecture Decisions

- **Modular monolith** (not microservices) — modules are Maven submodules in one deployable unit, designed for future extraction
- **API convention**: RESTful `/api/v1/{module}/{resource}`, unified JSON response `{code, message, data, timestamp}`
- **Auth**: JWT (Access 2h + Refresh 7d in Redis), RBAC with data-level permissions (department/personal/company-wide)
- **Primary keys**: UUID (`gen_random_uuid()`), not auto-increment
- **Soft delete**: `deleted` boolean + `deleted_at` timestamptz on all business tables
- **Partitioned tables**: `inventory_transaction` and `sys_operation_log` partitioned by month on `created_at`
- **Inventory locking**: pessimistic lock (`SELECT FOR UPDATE`) to prevent overselling
- **E-commerce integration**: unified `EcommercePlatformService` interface with per-platform implementations; order sync via RabbitMQ
- **Desktop printing**: Tauri Rust commands call native print APIs (Win32 GDI / CUPS); Web端 generates PDF via OpenPDF

## Database Conventions

- Table/column names: `lower_snake_case`
- All tables: audit columns `created_by`, `created_at`, `updated_by`, `updated_at`
- Timestamps: `TIMESTAMPTZ` (with timezone)
- Index naming: `idx_{table}_{column}`, FK naming: `fk_{table}_{ref_table}`
- Dynamic specs stored as JSONB (product specifications, label template configs, platform raw data)
- Generated columns for computed values (e.g., `available_quantity = quantity - locked_quantity`)

## Development Plan (20 weeks, 5 milestones)

1. **M1 (weeks 1-3)**: Project scaffold + auth + system management
2. **M2 (weeks 4-7)**: Product + material + inventory + desktop label printing
3. **M3 (weeks 8-12)**: Sales + procurement + e-commerce integration (Taobao/JD first)
4. **M4 (weeks 13-16)**: Finance + pricing + approvals + reports
5. **M5 (weeks 17-20)**: Production + mobile app + remaining e-commerce platforms + optimization

## Coding Conventions

- Backend: Alibaba Java Development Manual, Checkstyle + SpotBugs, methods ≤80 lines, classes ≤500 lines
- Frontend: ESLint + Prettier, functional components with Hooks, TypeScript interfaces for all props
- Git commits: `feat(scope): description`, `fix(scope): description`, conventional commits in English
- Branches: `main` → `develop` → `feature/{module}`

## Error Code Ranges

10000-19999 system, 20000-29999 product, 30000-39999 inventory, 40000-49999 sales, 50000-59999 finance, 60000-69999 integration
