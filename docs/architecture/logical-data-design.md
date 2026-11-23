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

**Accepted rule (2026-11-23): every Assessment belongs to exactly one Council.** The physical model must make `Assessment.councilId` mandatory, non-null and immutable after creation. An assessment is never shared across councils. The organizer must have an active OrganizerAuthority for that same council and relevant scope. A school participates only through its CouncilSchoolRegistration for the assessment's owning council; its registration with another council is irrelevant to this assessment.

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
3. **Resolved:** an assessment belongs to exactly one council. This is not an open question. The remaining question is whether the organizer must be authorized by that council or may be a separate tenant identity with a council grant.
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


## 10. Accepted council-ownership constraints and Prisma mapping

### Accepted rules

- A physical School may have registrations under multiple Councils.
- A single Assessment has one and only one owning Council. `Assessment.councilId` is required and identifies its tenant.
- Assessment ownership is not inferred from participating schools and cannot be changed by adding/removing participation.
- Each AssessmentParticipation must reference a CouncilSchoolRegistration whose `councilId` equals the parent Assessment's `councilId`.

### Recommended database enforcement

Use composite keys to make cross-council mismatches impossible at the relational layer:

1. `CouncilSchoolRegistration`: retain its primary key and add `@@unique([councilId, id])`.
2. `Assessment`: add mandatory `councilId` and `@@unique([councilId, id])`.
3. `AssessmentParticipation`: store `councilId`, `assessmentId`, and `schoolRegistrationId`; create composite foreign keys `[councilId, assessmentId] → Assessment[councilId, id]` and `[councilId, schoolRegistrationId] → CouncilSchoolRegistration[councilId, id]`.
4. `AssessmentCandidate`: reference the scoped participation using council + assessment + participation identifiers, rather than independently accepting an unrelated school ID.
5. `Mark`: reference a candidate and an AssessmentLearningArea belonging to the same assessment/council.

Prisma compound relations should be used where the installed Prisma version supports the referenced compound unique keys. Where the exact relation cannot be expressed in Prisma, add a reviewed SQL foreign key in the generated migration and cover it with direct PostgreSQL integration tests. Do not settle for an application-only check for this core invariant.

### Existing repository compatibility findings

The current `prisma/schema.prisma` still models a single-cluster School, an Assessment without council ownership, an ExamCandidate linked directly to School, global Subject/Score records, and a legacy `Users` role enum that includes STUDENT/PARENT/PRINCIPAL. These structures are not yet compatible with the accepted domain model.

No Prisma schema or database migration has been changed in this design increment. Existing assessment ownership, current deployed rows and database migration state must be inspected before backfilling `councilId` or changing the legacy School/Candidate/Score relationships. The repository's existing `.env` history was previously flagged for credential rotation; do not expose or reuse any committed secret.

### Current implementation status

- Conceptual domain documentation updated with both accepted multi-council school registration and single-council assessment ownership.
- Logical data design documented on this branch.
- No production database was inspected or changed in this pass. The connected Supabase account returned no projects, so there is no verified Supabase database target to inspect.
- Redis, Figma and Canva are not required to define the relational model; defer caching and UI design until the database boundaries and workflows are approved.


## 13. Existing assessment data spans multiple councils — confirmed

**Confirmed by product owner (2026-11-23): existing assessments belong to different councils.** Therefore, the legacy data migration must not assign a single default council to all assessments and must not infer assessment ownership from the school alone.

### Required assessment ownership mapping

Before adding a mandatory `Assessment.councilId`:

1. Build an explicit mapping for every existing assessment: `legacyAssessmentId → councilId`.
2. Obtain the mapping from an authoritative source (for example, existing operational records, assessment setup records outside this schema, or an owner-verified import file).
3. Validate that every mapped council exists and that no assessment has zero or multiple owners.
4. For each candidate, resolve the school to the canonical School identity and the CouncilSchoolRegistration under the assessment's mapped council.
5. Create the corresponding AssessmentParticipation for that assessment + registration pair.
6. Verify that each candidate's school registration belongs to the same council as the assessment.
7. Stop migration for any assessment/candidate whose council or registration cannot be determined. Do not guess based on school name, cluster name, assessment title or year.

A temporary staging table/file such as `LegacyAssessmentCouncilMap(legacyAssessmentId, councilCode, verifiedBy, verifiedAt, sourceReference)` can be used to validate the mapping. It is a migration aid, not necessarily a permanent runtime entity. Keep the original assessment IDs stable where possible.

### Important limitation of the current Prisma schema

The current repository schema has no Council model and no `Assessment.councilId`; its Assessment only has name/year/timestamps. Therefore, the current schema cannot itself establish council ownership. The legacy ownership mapping must be sourced and verified before backfill. The current ExamCandidate.schoolId is also insufficient to identify the correct council registration where a school belongs to multiple councils.

### Migration gates

- Zero unmapped assessments.
- Exactly one verified council owner per assessment.
- Zero candidate-to-registration council mismatches.
- Every participation references a registration belonging to its assessment's council.
- Counts and score totals reconcile before and after migration.
- Ambiguous rows are quarantined for manual resolution; no destructive cleanup until sign-off.


## 14. Hybrid legacy assessment ownership discovery — accepted approach

**Decision (2026-11-23):** use a combination of existing authoritative records and manual owner verification to establish the council owner of each legacy assessment. This selects the discovery method; it does not yet identify the actual source systems, files or named verifiers.

### 14.1 Two-track evidence workflow

1. Inventory every legacy Assessment row without changing it. Preserve its original ID, name, year and timestamps.
2. Search available operational records and source files for explicit assessment-to-council ownership evidence. Record the exact source and locator (for example, source system/table and row key, or file name and worksheet/row).
3. Where authoritative evidence exists, propose the council mapping and retain the evidence reference. A match is not considered verified until it passes the ownership review.
4. Where evidence is missing, conflicting or non-unique, route the assessment to manual review by an authorized owner. Record the decision and its verifier.
5. Reconcile the evidence-derived and manually verified mappings into one controlled mapping register.
6. Validate that every legacy assessment has exactly one verified Council ID before any backfill begins.

Do not treat a candidate's School ID, school name, cluster, assessment title, year, or the presence of a school in a council as proof of assessment ownership. Such fields may help locate records for review, but they are not ownership evidence.

### 14.2 Mapping register / staging structure

A controlled CSV or temporary staging table may contain:

| Field | Purpose |
|---|---|
| legacyAssessmentId | Exact primary key of the legacy Assessment row |
| legacyAssessmentName | Read-only context copied from the source |
| legacyAssessmentYear | Read-only context copied from the source |
| evidenceType | Existing authoritative record or manual owner decision |
| evidenceSource | Source system, table, file or register name |
| evidenceLocator | Exact row key, record ID, worksheet and row, or document reference |
| proposedCouncilCode | Suggested council code, if known; not an authorization value |
| verifiedCouncilId | FK to the canonical Council selected after verification |
| verificationStatus | UNREVIEWED, EVIDENCE_FOUND, MANUAL_REVIEW_REQUIRED, VERIFIED, CONFLICT or QUARANTINED |
| verifiedBy | Account/person identifier of the authorized verifier |
| verifiedAt | Timestamp of verification |
| verificationNotes | Explanation of decision, conflict resolution or quarantine |

The register must enforce one final verified mapping per legacy assessment. Keep raw evidence and the final decision distinguishable: never overwrite the source evidence with a manual correction. If sources conflict, retain both references and require an explicit resolution record.

### 14.3 Review and reconciliation rules

- Evidence-backed mappings must point to an identifiable authoritative source record.
- Manual mappings must record who made the ownership decision and when.
- Conflicting sources require resolution; do not use majority voting or an unapproved heuristic.
- Unknown council codes, missing councils, duplicate final mappings and unmapped assessments are blocking errors.
- A proposed council code is not sufficient: the final mapping must resolve to one existing Council primary key.
- Keep an immutable export of the approved mapping register with the migration run artifacts.

### 14.4 Migration gates

The assessment ownership backfill remains blocked until all of the following hold:

1. Every legacy assessment is present in the inventory.
2. Every assessment has exactly one final mapping to an existing Council.
3. Every mapping is VERIFIED and has a source reference or manual verifier record.
4. No assessment has a conflicting or quarantined final mapping.
5. Candidate-to-school resolution is reviewed independently against the selected council's CouncilSchoolRegistration; school ownership must not be inferred from assessment ownership.
6. Candidate counts, participation counts and score totals reconcile before and after a dry run.
7. The owner approves the mapping register and the dry-run reconciliation report.

**Current status:** the hybrid evidence + manual verification approach is accepted. The actual authoritative source locations, manual verifier(s), assessment inventory and mapping values are still unknown. No database was inspected or modified, and no migration is authorized by this decision.


## 15. Assessment creation and ownership authority — accepted

**Decision (2026-11-23): councils create their own assessments.** The Council is both the creator-side authority and the permanent tenant owner of each assessment.

### Creation invariant

1. An authenticated user must have an active permission to create assessments for the selected Council.
2. The server derives Assessment.councilId from the verified council membership / active council context. A client-supplied council ID is only a requested context and must be checked against that authority; it is never trusted as authorization.
3. The assessment is created with that mandatory councilId in the same transaction as its initial audit event.
4. The owning councilId is immutable after creation. A transfer, if ever required, must be a separately designed, explicitly authorized and fully audited business process; it must not be implemented as an ordinary update.
5. Every participating school must have an eligible CouncilSchoolRegistration under that same council.
6. An external organizer, where used, is a delegated actor operating under the council's explicit authority. Organizer assignment does not make the organizer the tenant owner and does not change assessment ownership.

### Effect on legacy migration

For newly created assessments, the creator's verified council context provides the authoritative ownership value. For legacy assessments, the current schema has no creator-council relationship or Assessment.councilId; do not assume the present createdAt, name, school, or creator account alone proves ownership. Continue to map historical assessments using authoritative historical council records and manual verification where necessary.

### Status

The business rule that councils create and own their assessments is accepted. **A Council Administrator with an active Council Administrator membership for that council is authorized to create its assessments.** The permission is council-scoped: the administrator cannot create assessments for another council without a separate active Council Administrator membership there. The server must verify the active membership and derive the owning council from the authorized context; a client-supplied council ID is not proof of authority. Other council permissions and any finer-grained delegation remain part of the authorization matrix. No Prisma schema or database migration was changed by this documentation update.


## 16. Organizer authority and cross-council coordination — accepted (2026-11-23)

### Accepted business rule

An independent organizer may coordinate an examination involving schools registered under multiple councils, but the organizer coordinates separate assessments—one per council. Each Assessment has exactly one owning Council. There is no shared/multi-council Assessment aggregate.

For each participating Council, the organizer must hold an independently granted, active OrganizerAuthority. An authority record for Council A never authorizes operations or data access for Council B. Organizer assignment is delegation only; it does not transfer tenant ownership.

### Logical authorization requirements

OrganizerAuthority must capture at least:
- the granting `councilId`;
- the authorized `organizationId`;
- the scope of the grant (assessment-specific or a council-defined bounded scope);
- the independently assigned permissions/capabilities;
- status and validity interval;
- the granting actor and grant timestamp;
- revocation actor, timestamp and reason where revoked.

Candidate capability dimensions, to be finalized in the authorization matrix:
1. create/coordinate assessments;
2. manage invitations and participating schools;
3. manage candidate/participation records;
4. validate submissions and marks and resolve validation issues;
5. release results.

These capabilities must be independently assignable. Result release must never be inferred from coordination or validation. The service must verify the authority record and the requested capability on every protected operation, including background jobs, exports and downloads. Expired, revoked, inactive or out-of-scope grants deny access.

### Cross-council reporting

A consolidated report spanning separate council assessments may be supported only as a distinct, explicitly authorized reporting operation. Its access policy, approved fields, aggregation/anonymization rules and audit requirements remain to be designed. It must not create cross-council participation links or merge candidate, mark, approval or release records.

### Accepted grant and approval policy

**Decision (2026-11-23):** the Council Administrator may grant, modify and revoke OrganizerAuthority for their own council. This authority is council-scoped; an administrator acting for Council A cannot grant authority on behalf of Council B without the appropriate active membership and authority there.

The sensitive `RELEASE_RESULTS` capability requires approval by a second authorized council official before it becomes effective. The grantor cannot approve their own request. The second approver must be distinct from the initiating Council Administrator and must hold an active council-scoped role/permission explicitly eligible to approve organizer result-release authority. The precise eligible role title is to be finalized in the authorization matrix; do not assume every council member qualifies.

Other organizer capabilities may be granted, modified or revoked by the Council Administrator under the council's policy. Every grant/change/revocation and approval/rejection must create an immutable audit event, including actor, council, organization, scope, capability changes, timestamp and reason where applicable. A pending result-release grant is not effective until approved. Rejection leaves that capability ungranted. Revocation must take effect immediately for subsequent protected operations; revocation of a grant does not erase historical actions.

### Council Approver role — accepted

**Decision (2026-11-23):** introduce a distinct council-scoped `CouncilApprover` role (or equivalent scoped role assignment) for independent approval of sensitive organizer permissions.

- The Council Administrator may assign and revoke the Council Approver role for an individual with an active membership in that same council.
- A Council Approver may approve or reject pending requests for the sensitive `RELEASE_RESULTS` capability, subject to the council's approval policy.
- The approver must be a different person from the grant requester. Self-approval is prohibited, including where one person holds multiple council roles.
- The Council Approver role grants no automatic assessment creation, assessment management, marks validation, result-release execution, or general organizer-management permissions. It confers only the explicitly defined approval capability.
- Role assignment, revocation, approval and rejection must be audited. Removing or suspending the approver's active council membership/role removes their ability to approve subsequent requests.
- The approval service must verify the approver's active council membership, active Council Approver assignment, matching council, pending request state and separation-of-duties rule at decision time.

### Remaining authorization decisions

The following remain open for the authorization matrix:
- **Authority scope (accepted 2026-11-23):** councils may grant either assessment-specific or council-wide organizer authority. Assessment-specific authority is the default and is limited to the named assessment. Council-wide authority is optional and must be explicitly selected by the Council Administrator, with its capabilities and validity period defined. Both scopes remain confined to the granting council; neither grants access to another council. Every operation must enforce the grant's scope and capabilities. Council-wide authority does not implicitly include `RELEASE_RESULTS`, which still requires independent Council Approver approval.
- What are the maximum grant duration, renewal and emergency revocation rules?
### Organizer staff delegation — accepted

**Decision (2026-11-23):** an authorized Organization may delegate permitted operational work to named, individually authenticated organizer staff members, subject to the following controls.

- The Council grants `OrganizerAuthority` to the Organization. The Organization Administrator assigns named staff members to perform work on its behalf.
- Every staff member uses an individual account; shared organizational credentials are not an acceptable delegation mechanism.
- A staff member may receive only capabilities that are both included in the Organization's active council grant and explicitly assigned to that staff member.
- Staff permissions cannot exceed the parent grant's council, assessment scope, capabilities or validity interval. Assessment-specific grants remain limited to their named assessment; council-wide grants remain limited to that council.
- Staff cannot grant authority to other staff or further delegate their own permissions.
- Ordinary staff assignment cannot confer `RELEASE_RESULTS`. Any staff member intended to approve a release-authority grant must independently hold an active Council Approver assignment for that council; any staff member intended to execute result release must receive explicit council authorization through a separately defined release permission and approval process. The Council Approver role alone does not grant execution rights.
- The Organization Administrator may revoke a staff assignment. Revocation immediately blocks subsequent protected operations by that staff member.
- Suspension, expiry or revocation of the parent OrganizerAuthority disables all dependent staff permissions.
- Audit records must identify the actual staff actor, Organization, Council, assessment, effective capabilities and action. Staff assignment, capability changes and revocations must also be audited.
- Each protected operation must verify the staff member's active organization assignment and effective permissions against the current parent OrganizerAuthority; do not rely on stale tokens or client-supplied scope.

### Remaining authorization decisions

The following remain open for the authorization matrix:
- What are the maximum grant duration, renewal and emergency revocation rules?
- Which other actions, if any, require dual control or additional approval?

**Status:** separate assessments, independent council grants, Council Administrator grant/change/revoke authority, second-person approval for `RELEASE_RESULTS`, the distinct Council Approver role, assessment-specific default/council-wide authority scopes, and constrained non-transitive organizer staff delegation are accepted. Grant lifecycle and any further dual-control actions remain unresolved. No Prisma schema or database migration was changed or authorized.
- Which other actions, if any, require dual control or additional approval?

**Status:** separate assessments, independent council grants, Council Administrator grant/change/revoke authority, second-person approval for `RELEASE_RESULTS`, and the distinct Council Approver role are accepted. Grant lifecycle, organizer staff delegation and any further dual-control actions remain unresolved. No Prisma schema or database migration was changed or authorized.
