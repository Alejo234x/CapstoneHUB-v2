# Database Schema (Prisma)

The data layer is **PostgreSQL** accessed through **Prisma 7**. The source of
truth is `hub-backend/prisma/schema.prisma`; migrations live in
`hub-backend/prisma/migrations/`.

See also: [Backend architecture](./backend_arch.md).

## Enums

- `ProjectStatus`: `proposed`, `under_review`, `approved`, `assigned`,
  `in_progress`, `closed`, `rejected`.
- `UserRole`: `admin`, `evaluator`, `coordinator`, `advisor`, `student`.
- `ActorRole`: `advisor`, `coordinator`, `student`, `evaluator`.

## Entities

### User

Account and global roles. `email` is unique and `isActive` gates access.
Passwords are stored as a `scrypt` hash, never in plain text.

### UserRoleAssignment

Join table giving a user one or more global roles. Unique per
`(userId, role)`.

### Project

The central entity. Holds descriptive fields, status, dates and estimated
cost, and owns every related record through cascading deletes.

### ProjectSchool

Schools associated with a project. Composite primary key
`(projectId, schoolName)`.

### ProjectNaturalProposer / ProjectLegalProposer

Optional proposer data: a natural person (`fullName`, `idNumber`, `email`) or
a legal entity (`legalName`, unique `nit`, `email`, `phone`, `contactUrl`). A
project has at most one of each (one-to-one via `projectId`).

### ProjectActorAssignment

Links a `User` to a `Project` with an `ActorRole`. Unique per
`(projectId, userId)`.

### ProjectObservation

Free-text comments on a project. The author is optional (`SetNull` on user
delete).

### ProjectStatusHistory

Audit log of status changes: `previousStatus`, `nextStatus`, optional
`description` and author. Written inside the same transaction as the status
update.

### ProjectMilestones

Scheduled deliverables with `title`, optional `description`, `dueDate` and a
`completed` flag.

### ProjectAttachment

Metadata for an uploaded file. The binary is stored in S3/MinIO; `storageKey`
is unique and points to the object.

## UML class diagram

```mermaid
classDiagram
    direction LR

    class User {
        +Int id
        +String fullName
        +String email
        +String passwordHash
        +Boolean isActive
        +DateTime emailVerifiedAt
        +DateTime lastLoginAt
        +DateTime createdAt
        +DateTime updatedAt
    }

    class UserRoleAssignment {
        +Int id
        +Int userId
        +UserRole role
        +DateTime assignedAt
    }

    class Project {
        +Int id
        +String name
        +String description
        +String context
        +String location
        +ProjectStatus status
        +DateTime startDate
        +DateTime endDate
        +Decimal estimatedCost
        +DateTime createdAt
        +DateTime updatedAt
    }

    class ProjectSchool {
        +Int projectId
        +String schoolName
        +DateTime createdAt
    }

    class ProjectNaturalProposer {
        +Int projectId
        +String fullName
        +String idNumber
        +String email
        +DateTime createdAt
    }

    class ProjectLegalProposer {
        +Int projectId
        +String legalName
        +String nit
        +String email
        +String phone
        +String contactUrl
        +DateTime createdAt
    }

    class ProjectActorAssignment {
        +Int id
        +Int projectId
        +Int userId
        +ActorRole role
        +DateTime assignedAt
    }

    class ProjectObservation {
        +Int id
        +Int projectId
        +Int authorUserId
        +String content
        +DateTime createdAt
    }

    class ProjectStatusHistory {
        +Int id
        +Int projectId
        +ProjectStatus previousStatus
        +ProjectStatus nextStatus
        +String description
        +Int authorUserId
        +DateTime changedAt
    }

    class ProjectMilestones {
        +Int id
        +Int projectId
        +String title
        +String description
        +DateTime dueDate
        +Boolean completed
        +DateTime createdAt
    }

    class ProjectAttachment {
        +Int id
        +Int projectId
        +Int uploadedByUserId
        +String originalName
        +String storageKey
        +String mimeType
        +Int sizeBytes
        +DateTime createdAt
    }

    class ProjectStatus {
        <<enumeration>>
        proposed
        under_review
        approved
        assigned
        in_progress
        closed
        rejected
    }

    class UserRole {
        <<enumeration>>
        admin
        evaluator
        coordinator
        advisor
        student
    }

    class ActorRole {
        <<enumeration>>
        advisor
        coordinator
        student
        evaluator
    }

    User "1" --> "0..*" UserRoleAssignment : roleAssignments
    User "1" --> "0..*" ProjectActorAssignment : projectAssignments
    User "0..1" --> "0..*" ProjectObservation : authoredObservations
    User "0..1" --> "0..*" ProjectStatusHistory : projectStatusHistories
    User "0..1" --> "0..*" ProjectAttachment : uploadedAttachments

    Project "1" *-- "0..*" ProjectSchool : schools
    Project "1" *-- "0..1" ProjectNaturalProposer : naturalProposer
    Project "1" *-- "0..1" ProjectLegalProposer : legalProposer
    Project "1" *-- "0..*" ProjectActorAssignment : actorAssignments
    Project "1" *-- "0..*" ProjectObservation : observations
    Project "1" *-- "0..*" ProjectStatusHistory : statusHistory
    Project "1" *-- "0..*" ProjectMilestones : milestones
    Project "1" *-- "0..*" ProjectAttachment : attachments

    UserRoleAssignment ..> UserRole
    ProjectActorAssignment ..> ActorRole
    Project ..> ProjectStatus
    ProjectStatusHistory ..> ProjectStatus
```

## Notes

- All project-owned tables cascade on project delete, so removing a project
  cleans up its dependent rows.
- References to `User` use `SetNull` where the record should survive the user
  (observations, status history, attachments) and `Cascade` where it should
  not (role and actor assignments).
- Indexes are declared for common filters: project `status`, `startDate` and
  `createdAt`, plus foreign keys and dates used in listings.
