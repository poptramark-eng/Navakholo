# CBE Platform — Logical Data Design (Draft)

**Status:** Draft for domain validation; not approved for Prisma migration  
**Baseline:** 2026-11-23  
**Repository branch:** `foundation/domain-model`

## 1. Purpose and design constraints

This document translates the accepted conceptual model into a logical relational design. It proposes attributes, PostgreSQL-oriented types, keys, constraints and indexes. It is not yet a production Prisma schema or migration.

Design constraints:

- PostgreSQL is the system of record; Prisma is the application data-mapping layer.
- A canonical School is independent of any council. **One school may register with multiple independent councils.**
- A Council is a tenant boundary. Council-specific data must be scoped by `councilId` or through a council-owned aggregate.
- Global identity records must not be duplicated merely because a person or school has multiple memberships.
- Workflow history (mark revisions, submissions, approvals, releases and audit events) must be retained rather than overwritten.
- Learners do not have login accounts. A learner identifier is not an authentication secret.
- School-level actors are School Administrators and Teachers. Platform Operators are separate platform-scoped actors.
- Do not implement assumptions marked TBD as permanent business rules.

## 2. Multi-council school registration — accepted rule

A School is a single canonical institution record. Each council maintains a separate `CouncilSchoolRegistration` joining that school to the council's own registry.

Example:

- School A → Council X registration: code `X-001`, Cluster North, status ACTIVE.
- School A → Council Y registration: code `Y-774`, Cluster Central, status ACTIVE.

These are two registrations for one School identity. They may have different codes, geography, status, dates, approval history and council-specific metadata.

### Required relational constraints

- `School.id` is the canonical primary key and contains no single `councilId` or council-specific `clusterId`.
- `CouncilSchoolRegistration.councilId` references Council.
- `CouncilSchoolRegistration.schoolId` references School.
- `CouncilSchoolRegistration.clusterId` references a Cluster owned by the same Council.
- Unique `(councilId, schoolId)` prevents duplicate current registry records for the same school/council pair.
- Unique `(councilId, councilSchoolCode)` prevents duplicate codes within a council while allowing the same code in different councils.
- `AssessmentParticipation` references the relevant CouncilSchoolRegistration, not School directly.
- Every council query is authorized against the caller's council membership and the registration's council. Knowing a School ID or another council's registration ID is never sufficient authorization.

**Historical registration question (TBD):** should a school that leaves and later rejoins the same council reactivate the existing registration row, or create a new registration episode? If separate episodes are required, use a stable registration identity plus a child `CouncilSchoolRegistrationPeriod` / history table rather than weakening the uniqueness rule without a lifecycle policy.

## 3. Logical entities and proposed fields

Types below are PostgreSQL-oriented. `UUID` is the proposed primary-key type unless noted. Use `TIMESTAMPTZ` for instants. Monetary fields are not currently required. Avoid floating-point types for marks.

### 3.1 Platform, council and organization

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| PlatformOperator | id, personId, accountId, status, createdAt | PK id; unique personId and accountId where present |
| Council | id, name, slug, status, createdAt, updatedAt | PK id; unique slug; status enum |
| CouncilMembership | id, councilId, personId/accountId, role, status, startsAt, endsAt | FK council; unique active membership by council + principal; role enum subject to authorization design |
| Organization | id, legalName, displayName, organizationType, status | PK id; legal identifier uniqueness/issuer TBD |
| OrganizerAuthority | id, councilId, organizationId, scope, status, startsAt, endsAt, grantedBy | FKs council and organization; unique active grant for council + organization + scope as policy permits |

A Council is a tenant. An Organization is an organizer identity. Do not infer tenant access from the organizer relationship alone; require an active authority grant for the assessment and operation being requested.

### 3.2 Geography

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| Region | id, councilId, name, code | FK council; unique (councilId, code) and (councilId, name) |
| County | id, councilId, regionId, name, code | FK council and region; composite consistency must ensure region belongs to same council |
| Subcounty | id, councilId, countyId, name, code | FK county; council consistency |
| Zone | id, councilId, subcountyId, name, code | FK subcounty; council consistency |
| Cluster | id, councilId, zoneId, name, code | FK zone; council consistency |

Use composite unique keys such as `(id, councilId)` on parent geography tables and composite foreign keys from children to enforce same-council ancestry at the database level where supported by the chosen Prisma mapping. Otherwise enforce with transactions and integration tests.

### 3.3 School registry and membership

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| School | id, canonicalName, institutionType, canonicalStatus, createdAt, updatedAt | PK id; global official identifier/issuer TBD; no councilId or clusterId |
| CouncilSchoolRegistration | id, councilId, schoolId, clusterId, councilSchoolCode, registrationNumber, status, submittedAt, approvedAt, effectiveFrom, effectiveTo, createdAt, updatedAt | FKs council, school, cluster; unique (councilId, schoolId); unique (councilId, councilSchoolCode); cluster must belong to council |
| Person | id, givenName, middleName, familyName, contact fields, createdAt | PK id; minimize global personal data; verified identity matching policy TBD |
| UserAccount | id, personId, email, phone, passwordHash, status, lastLoginAt, createdAt | PK id; unique normalized email/phone where supplied; one account per Person unless an approved exception exists |
| TeacherIdentity | id, personId, issuingAuthority, professionalIdentifier, verificationStatus | unique (issuingAuthority, professionalIdentifier); one TeacherIdentity per Person |
| SchoolMembership | id, schoolRegistrationId, personId, role, status, startsAt, endsAt, createdBy | FK registration and person; unique active (schoolRegistrationId, personId, role) as role policy permits |
| StaffAssignment | id, schoolMembershipId, gradeId, learningAreaId, assignmentType, startsAt, endsAt | FK membership; scope fields nullable only where assignment type permits |

The initial registrant may be attached as the initial School Administrator, but the school and membership remain pending until platform approval. Pending records grant no school-management permission. A School Administrator may attach an existing global TeacherIdentity to the school instead of creating a duplicate identity.

**Identity governance TBD:** source of truth for canonical school name/identifier; verified teacher identifiers; duplicate resolution; whether contact details are global or membership-specific.

### 3.4 Curriculum and grading configuration

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| Curriculum | id, councilId, name, version, status, effectiveFrom, effectiveTo | FK council; unique (councilId, name, version) |
| Grade | id, code, displayName, sortOrder | unique code; canonical Grades 1–9 unless curriculum policy expands |
| LearningArea | id, councilId or canonicalCode, name, code, status | ownership model TBD; unique code in chosen scope |
| GradeLearningArea | id, curriculumId, gradeId, learningAreaId, sortOrder, status | unique (curriculumId, gradeId, learningAreaId) |
| GradingRubric | id, councilId, curriculumId, gradeId, version, status, effectiveFrom, effectiveTo | unique version within its council/curriculum/grade scope |
| RubricLevel | id, rubricId, code, label, minValue, maxValue, sortOrder | unique (rubricId, code); no hard-coded unapproved boundaries |

Assessment configuration should pin immutable curriculum and rubric versions. Do not mutate a rubric version already used by a released assessment; publish a new version.

### 3.5 Assessment and participation

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| Assessment | id, councilId, organizerOrganizationId, reference, name, assessmentType, academicYear, status, createdBy, createdAt | FK council and organizer; unique (councilId, reference) |
| AssessmentGrade | id, assessmentId, gradeId | unique (assessmentId, gradeId) |
| AssessmentLearningArea | id, assessmentId, gradeLearningAreaId, maxMark, decimalPlaces, sortOrder | unique (assessmentId, gradeLearningAreaId) |
| AssessmentWindow | id, assessmentId, windowType, opensAt, closesAt, status | index (assessmentId, windowType) |
| AssessmentParticipation | id, assessmentId, schoolRegistrationId, status, invitedAt, acceptedAt, submittedAt | unique (assessmentId, schoolRegistrationId) |

Assessment is tenant-owned by one council in this draft. The organizer must have an active OrganizerAuthority for that council and relevant scope. Cross-council assessment ownership/participation is not approved; do not infer it from multi-council school registration.

### 3.6 Learners, candidates and marks

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| LearnerIdentity | id, learnerIdentifier, identifierIssuer, status, createdAt | unique (identifierIssuer, learnerIdentifier); learner has no UserAccount |
| AssessmentCandidate | id, assessmentId, assessmentParticipationId, learnerIdentityId, gradeId, candidateNumber, nameSnapshot, genderSnapshot, status | unique (assessmentId, learnerIdentityId) for current one-entry assumption; candidate number unique within assessment/participation as policy decides |
| Mark | id, assessmentCandidateId, assessmentLearningAreaId, value, enteredBy, enteredAt, currentRevision | unique (assessmentCandidateId, assessmentLearningAreaId); value NUMERIC(7,2) proposed, bounded by configured maxMark |
| MarkRevision | id, markId, revisionNumber, previousValue, newValue, changedBy, reason, changedAt, approvalId | unique (markId, revisionNumber); append-only |

A candidate's participation and assessment must agree. The candidate grade must be included in the assessment, and the learning area must be configured for that grade. Enforce through composite keys/constraints where practical and transactional validation otherwise.

The one-candidate-per-learner-per-assessment rule is provisional pending confirmation of multiple papers, sessions, transfers and repeat entries.

### 3.7 Submission, validation, governance and release

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| MarkEntryBatch | id, assessmentParticipationId, createdBy, sourceType, idempotencyKey, status, createdAt | unique idempotencyKey within participation |
| SchoolSubmission | id, assessmentParticipationId, version, submittedBy, submittedAt, status, supersedesSubmissionId | unique (assessmentParticipationId, version) |
| ValidationIssue | id, schoolSubmissionId, severity, code, message, entityType, entityId, resolvedAt, resolvedBy | index (schoolSubmissionId, severity, resolvedAt) |
| Review | id, assessmentId, schoolSubmissionId, reviewerId, decision, notes, reviewedAt | indexed by assessment and submission |
| Approval | id, assessmentId, authorityType, authorityId, decision, decidedBy, reason, decidedAt | append-only decision record; approval policy TBD |
| ResultRelease | id, assessmentId, version, releasedBy, releasedAt, status, correctionOfReleaseId | unique (assessmentId, version) |
| ResultSnapshot | id, resultReleaseId, candidateId, payload, createdAt | unique (resultReleaseId, candidateId); immutable snapshot |

Internal and external assessment workflows remain distinct. The required authority and sequence must be finalized in the workflow specification before state enums are frozen.

### 3.8 Audit and operational records

| Entity | Proposed attributes | Keys and constraints |
|---|---|---|
| AuditEvent | id, councilId nullable, actorAccountId, action, resourceType, resourceId, correlationId, beforeData, afterData, occurredAt | append-only; indexes by tenant/time, actor/time and resource |
| Notification | id, recipientAccountId, channel, templateKey, status, createdAt, sentAt | indexes by recipient/status and createdAt |
| ExportJob | id, councilId, requestedBy, assessmentId, exportType, filters, status, expiresAt, createdAt | every job re-authorizes at execution and download time |

Avoid placing unnecessary learner or staff personal data in audit payloads, notifications or export metadata.

## 4. Type, nullability and key conventions

- Primary keys: UUID generated by the application/database.
- Foreign keys: non-null by default; nullable only for explicitly optional relationships.
- Instants: PostgreSQL `TIMESTAMPTZ`; store UTC and render in the user's timezone.
- Dates without time: PostgreSQL `DATE`.
- Marks and thresholds: `NUMERIC(p,s)`, never `FLOAT`/JavaScript floating-point as persisted truth.
- Status and role fields: enums only after state/authorization workshops; use strings/check constraints if lifecycle is still changing.
- Names and identifiers: normalized comparison/unique indexes where needed; preserve original display values.
- Soft deletion: do not use as a substitute for lifecycle history or audit records.
- Uniqueness with nullable columns: define partial unique indexes explicitly in SQL where PostgreSQL semantics require them; verify Prisma migration support.
- Cross-tenant foreign keys: use composite keys or transactional checks to ensure referenced records belong to the same council.

## 5. Initial indexes and query patterns

| Query pattern | Proposed index |
|---|---|
| List registrations for a council | CouncilSchoolRegistration (councilId, status, clusterId) |
| Find a school's council registrations | CouncilSchoolRegistration (schoolId, status) |
| Validate council school code | unique (councilId, councilSchoolCode) |
| List assessments for council | Assessment (councilId, status, academicYear) |
| List participating schools | AssessmentParticipation (assessmentId, status) |
| List assessments for a school registration | AssessmentParticipation (schoolRegistrationId, status) |
| Candidate lookup | AssessmentCandidate (assessmentId, candidateNumber); unique learner/assessment |
| Candidate marks | Mark (assessmentCandidateId) |
| Submission workflow queue | SchoolSubmission (status, submittedAt) and participation FK |
| Result release history | ResultRelease (assessmentId, version DESC) |
| Audit investigation | AuditEvent (councilId, occurredAt DESC), (resourceType, resourceId, occurredAt DESC) |

Add indexes only after validating real query plans and data volumes. Do not index every foreign key blindly; PostgreSQL does not automatically index all referencing columns.

## 6. Tenant isolation rules

1. Resolve the authenticated principal and active council/school memberships on the server.
2. Scope all council-owned reads and writes by the authorized council.
3. Resolve school operations through the SchoolMembership and CouncilSchoolRegistration chain.
4. An AssessmentParticipation must point to a registration in the assessment's owning council.
5. Never accept a client-supplied councilId, schoolId, registrationId or assessmentId as proof of authorization.
6. Re-check authorization inside background export/report jobs and at download time.
7. Platform support access must be explicit, privileged, audited and separately authorized.
8. Test both allowed and denied cross-council access, including guessed IDs and nested routes.

## 7. Decisions required before physical Prisma schema

1. Who verifies and controls canonical School names and global identifiers?
2. Does re-registration after leaving a council reactivate the same registration row or create a new registration episode?
3. Can an assessment span multiple councils, or must it be owned by exactly one council?
4. Can an organizer own a separate tenant, or must it be authorized by a council?
5. What are the exact Council roles and permissions?
6. What verified identifiers establish Person and TeacherIdentity, and how are duplicates merged?
7. What is the authoritative learner identifier issuer and duplicate-correction process?
8. Can a learner appear more than once in one assessment for multiple papers/sessions?
9. Which learning areas are canonical/shared versus council-configured?
10. What is the complete mark correction and approval policy, including post-release corrections?
11. What exact state transitions and authorities apply to internal versus external assessments?
12. What are the retention, privacy, archival, export and deletion requirements?

## 8. Exit criteria for Prisma implementation

Do not create or alter Prisma models until the above decisions are resolved or explicitly accepted as documented provisional rules. Then:

1. Approve the entity data dictionary and authorization matrix.
2. Review the physical ERD, composite keys, unique constraints and indexes.
3. Inspect the existing database and map legacy records to canonical entities and council registrations.
4. Write a migration/backfill plan with preconditions, validation queries and rollback strategy.
5. Implement schema and migrations on a dedicated branch.
6. Add integration tests for multi-council registration, tenant isolation, candidate/mark integrity, workflow transitions and result immutability.
7. Verify migration against a production-like copy before deployment.

## 9. Related design

- [Conceptual Domain Model & Logical ERD](https://github.com/poptramark-eng/Navakholo/blob/foundation/domain-model/docs/architecture/conceptual-domain-model.md)
- Notion: 15 — Conceptual Domain Model & Logical ERD
