# System Architecture

## Purpose

This document defines the target application architecture for the product. It is the reference point for future implementation, refactoring, and code review decisions across frontend, backend, database, and AI-assisted workflows.

The architecture exists to ensure:

- consistent separation of concerns
- predictable code organization
- reusable business and AI logic
- easier testing and maintenance
- safer long-term feature delivery

## Technology Stack

### Frontend

- React
- TypeScript

### Backend

- FastAPI

### Database

- SQL Server

### AI

- LangChain-based generation services

## Architectural Principles

The system follows a layered architecture in both frontend and backend code.

### Core principles

- Each layer has a single primary responsibility.
- Higher layers may depend on lower layers, but lower layers must not depend on higher layers.
- Business rules belong in services, not in controllers or UI components.
- Database access belongs in repositories, not in services or controllers.
- Shared AI generation capabilities must be reusable across multiple features.
- UI should be composed from reusable primitives upward into domain-specific and workflow-specific modules.

## Backend Architecture

The backend follows this pattern:

`Controller -> Service -> Repository`

### Controller Layer

Controllers expose API endpoints and handle request/response concerns.

Responsibilities:

- define FastAPI routes
- validate and parse request inputs
- call the correct service methods
- map service results into API responses
- return appropriate HTTP status codes

Controllers should not:

- contain business rules
- directly query SQL Server
- duplicate AI generation logic

### Service Layer

Services contain business logic and application workflows.

Responsibilities:

- implement feature behavior
- orchestrate repository calls
- enforce domain rules and validation
- coordinate AI generation flows
- transform data between controller-facing and repository-facing structures

Services should:

- be reusable across endpoints
- remain independent of HTTP-specific concerns when possible
- centralize feature-specific business decisions

### Repository Layer

Repositories interact with SQL Server.

Responsibilities:

- execute data access logic
- encapsulate SQLAlchemy or database-specific queries
- map persistence operations cleanly for service consumption

Repositories should not:

- contain request handling logic
- contain frontend-facing response formatting
- own business workflows outside data retrieval and persistence

## AI Architecture

AI generation logic is a shared platform capability and must be reused across features rather than reimplemented separately.

Responsibilities of AI generation services:

- encapsulate LangChain-based orchestration
- provide reusable generation workflows
- standardize prompts, context preparation, parsing, and error handling
- support multiple product features through shared service interfaces

Design rules:

- keep prompt orchestration out of controllers
- place feature-specific AI workflows in services that call shared AI generation components
- avoid duplicating prompt or chain logic across unrelated modules
- define clear input and output contracts for AI-assisted operations

## Frontend Architecture

The frontend follows this pattern:

`Primitive -> Semantic -> Feature`

### Primitive Components

Primitive components are reusable UI building blocks.

Examples:

- buttons
- inputs
- modals
- tables
- layout shells
- typography primitives

Responsibilities:

- provide generic presentation and interaction patterns
- remain broadly reusable
- avoid feature-specific business behavior

### Semantic Components

Semantic components are domain-specific UI elements built from primitives.

Examples:

- user forms
- requirement cards
- review panels
- role or permission selectors

Responsibilities:

- express domain meaning in the UI
- compose primitives into business-aware components
- remain reusable within a domain area

### Feature Modules

Feature modules implement complete user workflows.

Examples:

- AI review
- requirement generation
- user management
- RBAC administration

Responsibilities:

- coordinate pages, state, semantic components, and API usage
- implement end-to-end user journeys
- keep workflow logic close to the feature

## Recommended Code Organization

### Backend

Backend code should be organized so that transport, business logic, persistence, and shared AI capabilities remain clearly separated.

Suggested structure:

```text
apps/fastapi/app/
├── routers/          # Controllers / API endpoints
├── services/         # Business logic and AI workflow orchestration
├── repositories/     # SQL Server access
├── models/           # Persistence models
├── schemas/          # Request/response schemas
├── core/             # Shared infrastructure and configuration
└── ai/               # Reusable LangChain-based generation services
```

### Frontend

Frontend code should make the component layering explicit.

Suggested structure:

```text
apps/web/src/
├── components/
│   ├── primitives/   # Generic building blocks
│   ├── semantic/     # Domain-specific reusable components
│   └── layout/       # Shared layout composition
├── features/         # Workflow-oriented feature modules
├── pages/            # Route-level entry points
├── api/              # API clients and services
├── hooks/            # Shared hooks
├── types/            # Shared TypeScript types
└── routes/           # Route definitions and guards
```

## Dependency Direction

Allowed backend dependency direction:

- controllers may depend on services
- services may depend on repositories and shared AI services
- repositories may depend on database models and infrastructure

Disallowed backend dependency direction:

- repositories must not depend on controllers
- services must not depend on FastAPI route behavior unless required by integration boundaries
- controllers must not contain repository queries

Allowed frontend dependency direction:

- feature modules may depend on semantic and primitive components
- semantic components may depend on primitive components
- pages may assemble features and layouts

Disallowed frontend dependency direction:

- primitive components must not depend on feature modules
- semantic components should not embed full workflow orchestration
- feature-specific logic should not leak into generic primitives

## Development Rules

### Backend rules

- Put endpoint definitions in controllers.
- Put business rules in services.
- Put SQL Server access in repositories.
- Reuse AI generation services instead of duplicating chains or prompts.
- Keep controllers thin and services authoritative.

### Frontend rules

- Build UI from primitives first, then semantic components, then feature modules.
- Keep primitives generic and reusable.
- Put domain meaning in semantic components.
- Put workflow behavior in feature modules and pages.
- Avoid mixing API orchestration directly into low-level UI primitives.

## Review Checklist

When adding or modifying code, verify:

1. Is the code placed in the correct architectural layer?
2. Does it duplicate logic that should be shared?
3. Is business logic incorrectly placed in controllers or UI components?
4. Is database logic incorrectly placed outside repositories?
5. Does the frontend change preserve the `Primitive -> Semantic -> Feature` composition model?
6. Does the backend change preserve the `Controller -> Service -> Repository` flow?
7. Can the AI-related logic be reused by another feature?

## Non-Goals

This document does not define:

- exact naming conventions for every module
- every folder currently present in the repository
- implementation details of specific features

Those may evolve, but they must remain aligned with the architectural patterns defined here.

## Decision Standard

When implementation options are unclear, choose the option that best preserves:

- separation of concerns
- reusability
- testability
- maintainability
- consistency with the defined layer boundaries

If an exception to this architecture is necessary, it should be explicit, documented, and justified by a clear technical constraint.
