# CBE Platform — Conceptual Domain Model & Logical ERD

**Status:** Proposed — for domain review, not approved for physical migration  
**Baseline date:** 2026-11-23  
**Implementation:** Next.js App Router + PostgreSQL + Prisma

## 1. Modelling decisions and boundaries

This model separates four concepts that the current implementation tends to combine:

1. **Tenant ownership:** a Council is the tenant boundary for council-owned data.
2. **Canonical identity:** a School, TeacherIdentity and LearnerIdentity represent real-world identities and should not be duplicated to represent membership or participation.
3. **Scoped relationships:** SchoolCouncilRegistration, SchoolMembership, StaffAssignment and AssessmentParticipation express where and how an identity is associated.
4. **Assessment workflow:** candidates, marks, submissions, validation, approval and release belong to a particular assessment and its participating schools.

An independent examination organiser is represented as an Organization. Each Council independently grants an OrganizerAuthority to the Organization. An organizer may coordinate an examination involving multiple Councils only through separate assessments—one per Council—with an active, explicitly scoped authority from each Council. No shared multi-council Assessment is permitted; organizer delegation does not change assessment ownership.

## 2. Conceptual ERD

```mermaid
erDiagram
  COUNCIL ||--o{ COUNCIL_MEMBERSHIP : has
  COUNCIL ||--o{ REGION : owns
  REGION ||--o{ COUNTY : contains
  COUNTY ||--o{ SUBCOUNTY : contains
  SUBCOUNTY ||--o{ ZONE : contains
  ZONE ||--o{ CLUSTER : contains
  CLUSTER ||--o{ COUNCIL_SCHOOL_REGISTRATION : locates
  SCHOOL ||--o{ COUNCIL_SCHOOL_REGISTRATION : registered_in
  ORGANIZATION ||--o{ ORGANIZER_AUTHORITY : receives
  COUNCIL ||--o{ ORGANIZER_AUTHORITY : grants
  ORGANIZATION ||--o{ ASSESSMENT : organizes
  COUNCIL ||--o{ ASSESSMENT : tenant_owns
  SCHOOL ||--o{ SCHOOL_MEMBERSHIP : has
  PERSON ||--o{ SCHOOL_MEMBERSHIP : joins
  PERSON ||--o| TEACHER_IDENTITY : may_be
  USER_ACCOUNT ||--o| PERSON : authenticates_as
  SCHOOL_MEMBERSHIP ||--o{ STAFF_ASSIGNMENT : receives
  COUNCIL ||--o{ CURRICULUM : configures
  CURRICULUM ||--o{ GRADE_LEARNING_AREA : defines
  LEARNING_AREA ||--o{ GRADE_LEARNING_AREA : applies_to
  ASSESSMENT ||--o{ ASSESSMENT_PARTICIPATION : invites
  SCHOOL ||--o{ ASSESSMENT_PARTICIPATION : participates
  ASSESSMENT ||--o{ ASSESSMENT_CANDIDATE : registers
  LEARNER_IDENTITY ||--o{ ASSESSMENT_CANDIDATE : appears_as
  ASSESSMENT_PARTICIPATION ||--o{ ASSESSMENT_CANDIDATE : includes
  ASSESSMENT_CANDIDATE ||--o{ MARK : receives
  LEARNING_AREA ||--o{ MARK : measured_in
  ASSESSMENT_PARTICIPATION ||--o{ SCHOOL_SUBMISSION : submits
  SCHOOL_SUBMISSION ||--o{ VALIDATION_ISSUE : reports
  SCHOOL_SUBMISSION ||--o{ MARK_REVISION : records
  ASSESSMENT ||--o{ RESULT_RELEASE : releases
  ASSESSMENT ||--o{ APPROVAL : requires
  COUNCIL ||--o{ AUDIT_EVENT : records
```

**Interpretation:** this is a conceptual relationship map. It intentionally omits some join entities and fields for readability. The logical model below defines the important associations and proposed constraints.

## 3. Logical entity catalogue

### 3.1 Platform, tenant and organizer

| Entity | Key relationships | Ownership / purpose |
|---|---|---|
| PlatformOperator | linked to UserAccount | Platform-controlled operator identity; provisioned by the platform owner, not self-registered as a school user |
| Council | owns geography, council configuration, school registrations and assessment tenant data | Tenant root; independent council data boundary |
| CouncilMembership | Council + Person/UserAccount | Council-scoped administration and permissions; exact council roles need validation |
| Organization | may receive OrganizerAuthority and organize Assessments | Canonical independent body, which may be a council or external organizer |
| OrganizerAuthority | Council + Organization | Explicit grant of authority, scope, validity dates and status; prevents an organizer from gaining access merely by knowing an assessment ID |

**Important:** do not treat `Organization` and `Council` as synonyms. A council is a tenant. An organizer is an organization authorized to run an assessment. An organization may be linked to more than one council only through explicit authority records.

### 3.2 Geography and schools

| Entity | Key relationships | Ownership / purpose |
|---|---|---|
| Region → County → Subcounty → Zone → Cluster | Parent-child hierarchy | Geography is owned by a Council; names and uniqueness are scoped to the parent and council |
| School | canonical identity | Represents the institution independently of any one council or assessment |
| CouncilSchoolRegistration | Council + School + Cluster | Registers a canonical school in a council's registry and places it in that council's geography; carries council-specific school code/status and effective dates |

**Accepted domain rule (2026-11-23):** one canonical School may hold active or historical registrations with multiple independent Councils. Do not store a single `councilId` or `clusterId` directly on canonical School. The council-specific geography, code, registration number, status and effective dates belong on each CouncilSchoolRegistration. A registration with Council X grants no access to Council Y's tenant data.

**Accepted domain rule (2026-11-23):** every Assessment belongs to exactly one Council. `Assessment.councilId` is mandatory; assessment ownership is not shared or inferred from participating schools. A school participates only through its CouncilSchoolRegistration for that same Council. The logical design uses composite foreign keys to prevent a participation from pairing an assessment owned by one council with a registration owned by another council.

### 3.3 People, accounts and school staffing

| Entity | Key relationships | Ownership / purpose |
|---|---|---|
| Person | may have UserAccount, TeacherIdentity and SchoolMembership records | Global human identity record, with minimal identifying data |
| UserAccount | optionally linked to Person; has credentials and account status | Authentication principal. A login account is not the same thing as a school membership |
| TeacherIdentity | one-to-one with Person | Global teacher identity and verified professional identifiers; uniqueness must be based on verified issuer/identifier, not name |
| SchoolMembership | Person + School (and normally CouncilSchoolRegistration) | School-specific association, status, dates and school-scoped role |
| StaffAssignment | SchoolMembership + optional grade/class/learning-area scope | Operational duties such as subject teacher or class teacher; assignment is not a new person identity |

The initial school registrant becomes the initial School Administrator, but the membership and school remain pending until platform approval. A pending membership must not grant school-management capabilities. A School Administrator may create a teacher identity or attach an existing global teacher identity to the school; this must not create a duplicate teacher.

Platform Administrators remain platform-scoped identities and must not be represented as ordinary school memberships.

### 3.4 Curriculum and grading

| Entity | Key relationships | Purpose |
|---|---|---|
| Curriculum | Council-owned or explicitly shared/versioned configuration | Defines curriculum version and applicability |
| Grade | canonical grade level, currently Grades 1–9 | Avoid free-text grade values |
| LearningArea | canonical or council-configured learning area | Reusable learning area identity |
| GradeLearningArea | Curriculum + Grade + LearningArea | Defines which learning areas apply to each grade and in which order |
| GradingRubric | Council + curriculum/grade + version | Versioned grading policy |
| RubricLevel | GradingRubric + level | Stores configurable labels and boundaries; do not hard-code unconfirmed thresholds |

An assessment must snapshot or reference immutable curriculum and rubric versions so a later configuration change cannot silently rewrite historical results.

### 3.5 Assessment and participation

| Entity | Key relationships | Purpose |
|---|---|---|
| Assessment | Council tenant + Organizer + assessment period/type | The assessment aggregate; records who owns the tenant data and who is authorized to organize it |
| AssessmentGrade | Assessment + Grade | Grades covered by the assessment |
| AssessmentLearningArea | Assessment + GradeLearningArea | Learning areas actually assessed for each grade |
| AssessmentWindow | Assessment + window type | Candidate registration, mark entry, correction and submission deadlines |
| AssessmentParticipation | Assessment + CouncilSchoolRegistration | A school's participation in a particular assessment, with invitation/acceptance/status |

School identity is not copied for every assessment. The assessment joins to a council-specific school registration through AssessmentParticipation. This ensures that every participating school is registered under the same Council that owns the Assessment. Cross-council coordination uses separate assessments and each school's registration under the relevant assessment-owning Council; there is no cross-council participation link.

### 3.6 Learners, candidates and marks

| Entity | Key relationships | Purpose |
|---|---|---|
| LearnerIdentity | global unique learner identifier | Learner has no login account; the identifier is not a password or authentication secret |
| AssessmentCandidate | Assessment + AssessmentParticipation + LearnerIdentity + Grade | Assessment-specific candidate registration, including required name/gender snapshots and registration status |
| Mark | AssessmentCandidate + AssessmentLearningArea | Final numerical mark for one candidate in one configured learning area |
| MarkRevision | Mark + actor + reason | Append-only record of corrections, previous/new values, timestamp and approval context |
| MarkEntryBatch | AssessmentParticipation + actor | Optional grouping for import/manual entry, idempotency and validation tracking |

Proposed integrity rules:
- A learner may appear at most once in an assessment, unless the business rules explicitly permit separate candidate entries by paper/session.
- A candidate must belong to the same assessment as the participation record.
- A candidate's grade must be included in the assessment and the learning area must apply to that grade.
- A mark must reference a learning area configured for that assessment and candidate grade.
- Marks must be within the assessment's configured range and precision.
- Mark correction must retain prior values and the actor/reason; do not overwrite without history.

### 3.7 Submission, validation, approval and release

| Entity | Key relationships | Purpose |
|---|---|---|
| SchoolSubmission | AssessmentParticipation + submission version + actor | Formal school submission; marks entered are not automatically submitted |
| ValidationIssue | SchoolSubmission + field/entity reference | Missing, invalid, inconsistent or duplicate data requiring resolution |
| Review | Submission or assessment + reviewer | Records a review action and findings |
| Approval | Assessment + approving authority + decision | Records required governance approval separately from publication |
| ResultRelease | Assessment + release actor + release version | Explicit publication/release event with timestamp and scope |
| ResultSnapshot | Assessment + release/version | Reproducible published results and rankings for a specific release |

Internal and external assessment workflows must remain distinct:

- **Internal:** school mark entry and submission → platform-administrator approval → school-administrator release.
- **External/inter-school:** participating school submission → organizer validation and issue resolution → organizer release.

Do not model one generic `approved` flag on Assessment as a substitute for these distinct transitions. The state machine and authority matrix must define guards, actors, reversibility and audit events.

### 3.8 Audit and operations

| Entity | Purpose |
|---|---|
| AuditEvent | Immutable record of actor, tenant, action, resource, timestamp, correlation ID and relevant before/after metadata |
| Notification | Delivery record for workflow notifications; avoid storing unnecessary sensitive content |
| ExportJob | Tenant- and scope-bound report/export request, status, expiry and download authorization |

Audit events should cover account and membership changes, school approval, assessment configuration, candidate changes, mark corrections, submission, validation, approval, release, exports and privileged support access.

## 4. Proposed cardinalities and uniqueness

| Rule | Proposed constraint |
|---|---|
| Geography | Unique name/code within the correct parent and council |
| School registry | Unique `(councilId, schoolId)` and unique `(councilId, councilSchoolCode)`; one canonical school may have registrations in multiple councils |
| Teacher identity | Unique verified identifier per issuing authority; never unique by name alone |
| Membership | Unique active membership for `(schoolRegistrationId, personId)` unless reactivation/history policy says otherwise |
| Assessment | Unique assessment reference within its owning council/organizer scope |
| Participation | Unique `(assessmentId, schoolRegistrationId)` |
| Candidate | Unique `(assessmentId, learnerIdentityId)` for the current one-entry-per-learner rule |
| Mark | Unique `(assessmentCandidateId, assessmentLearningAreaId)` |
| Release | Unique release version within an assessment; releases are append-only events |

These constraints must be reviewed against actual candidate transfer, repeat-candidate, multi-paper and school re-registration rules before physical implementation.

## 5. Tenant ownership and access matrix

| Data | Owner/scope | Typical access rule |
|---|---|---|
| Council settings and geography | Council | Council-authorized administrators; platform operators only through audited support policy |
| School canonical identity | Platform registry / canonical registry policy | Council sees only schools registered to it; editing authority for canonical fields still needs definition |
| CouncilSchoolRegistration | Council | Council registry administrators |
| SchoolMembership and StaffAssignment | School registration / council scope | School Administrator manages; teacher sees only their own applicable assignments |
| Curriculum and rubrics | Council | Council-authorized configuration roles; historical assessment versions remain immutable |
| Assessment | Council tenant + organizer authority | Organizer access is limited to assessments covered by its authority |
| Participation, candidates and marks | Assessment + participating school | School access limited to its participation; organizer access limited to its authorized assessment |
| Submission and validation | Assessment participation | Participating school and authorized organizer/reviewer according to workflow state |
| Approval and release | Assessment governance | Only the actor designated by the internal/external workflow |
| Results and exports | Assessment/release + requester scope | Same scope as source data; no broader access through reports or background jobs |
| AuditEvent | Tenant and platform scope | Restricted audit readers; tamper-resistant retention |

Every query and mutation must derive scope from the authenticated server-side principal and its active memberships/authority. Client-supplied councilId, schoolId, organizerId or assessmentId is only a selector to validate, never proof of access.

## 6. Proposed lifecycle boundaries

- School: `PENDING_APPROVAL → ACTIVE → SUSPENDED/REJECTED`; exact reactivation and closure rules TBD.
- School membership: `PENDING → ACTIVE → SUSPENDED/ENDED`; access is denied unless active and authorized.
- Assessment: `DRAFT → CONFIGURED → OPEN → ENTRY_CLOSED → SUBMITTED/UNDER_REVIEW → APPROVED (internal only) → RELEASED → ARCHIVED`; exact paths differ by type.
- Participation: `INVITED → ACCEPTED → ACTIVE → SUBMITTED → VALIDATED/ISSUES_FOUND → CLOSED`.
- Submission: versioned `DRAFT → SUBMITTED → UNDER_VALIDATION → ACCEPTED/REJECTED → RESUBMITTED`.
- Release: append-only release records; a later correction produces a new release version rather than mutating an already published snapshot.

These are candidate states only. They need process-owner validation before implementation.

## 7. Decisions still open — do not silently assume

1. Which organization verifies canonical school names/global identifiers, and how are duplicate canonical School records reconciled?
2. When a school leaves and later rejoins a Council, is its CouncilSchoolRegistration reactivated or is a new historical registration episode created?
3. Are councils allowed to manage their own user accounts, and what is the complete council-role/permission matrix beyond the accepted Council Administrator and Council Approver powers?
4. What verified identifier(s) establish a global TeacherIdentity, and what is the duplicate-resolution process?
5. What is the authoritative learner identifier issuer and how are missing, mistyped, duplicated or merged learner identities handled?
6. Can a learner appear more than once in one assessment for multiple papers/sessions, and what is the candidate uniqueness rule?
7. Are marks corrected before submission, after submission, after approval or after release, and what approval is required at each stage?
8. What exactly does platform approval mean for an internal assessment, and can it be revoked after approval?
9. What retention schedule, lawful-disposal exceptions, privacy controls, export rules and data-residency obligations apply? Ordinary permanent deletion of assessment evidence and audit history is prohibited.
10. What exact aggregation thresholds, report schema, recipient controls and retention apply to cross-council consolidated reports? The authorization boundary is already accepted: every affected Council must explicitly authorize the report.
11. What process, eligible approvers and impact controls would apply to a genuinely exceptional assessment ownership transfer? No transfer capability is authorized.

Resolved: canonical School may register with multiple Councils; every Assessment belongs to exactly one Council; organizers operate under independent Council-scoped authority; cross-council coordination uses separate assessments; organizer authority lifecycle, Council Approver controls, staff delegation, emergency revocation, retention safeguards and consolidated-report authorization are documented in Section 16 and the logical design. Do not list these resolved decisions as open questions.

## 8. Physical design not yet authorized

No Prisma schema migration is included in this increment. Before implementation, complete the data dictionary (types, nullability, defaults, uniqueness, indexes, owner, sensitivity and retention), authorization matrix, state diagrams, and a migration/backfill/rollback plan. Then map the approved logical entities to Prisma models and add tenant-isolation integration tests.

## 9. Source alignment

- Notion: CBE Engineering Workspace — agreed product and tenancy baseline.
- Notion: 04 — System Architecture, Domain, Data & API Design.
- Notion: 06 — Requirements Elicitation & Stakeholder Engagement.
- Notion: 08 — Software Requirements Specification (working draft).
- Notion: 11 — Business Process & Workflow Specification.
- Notion: 14 — Domain Modelling & Database Design.

## 16. Organizer authority and cross-council coordination — accepted (2026-11-23)

An independent organizer may coordinate examinations involving schools registered under multiple Councils only through separate assessments—one owned by each Council. Each Assessment has exactly one immutable owning Council; participation, candidates, marks, submissions, approvals and releases remain council-specific. No shared/multi-council Assessment is permitted.

Each Council independently grants an OrganizerAuthority to an Organization. A grant from one Council provides no authority or data access under another. The organizer is a delegated actor, not a tenant owner. Authority may be assessment-specific (default) or council-wide (only when explicitly selected), with separately assigned capabilities, status and validity interval.

A Council Administrator with active membership may grant, modify and revoke authority only for their own Council. Organizer capabilities are independent: create/coordinate assessments; manage invitations/participating schools; manage candidate/participation records; validate submissions/marks and resolve issues; release results. Every protected operation, including jobs, exports, downloads and staff actions, revalidates the active grant, council, scope, capability and validity.

### Council Approver and result-release control

Granting or changing RELEASE_RESULTS requires a Council Administrator request and approval by a distinct, active Council Approver for the same Council. Self-approval is prohibited even where one person holds multiple roles. The capability is ineffective while pending. Council Approver confers approval authority only, not assessment management or release execution. Capability reductions and revocations remain immediately executable by an authorized Council Administrator.

### Organizer staff delegation

An authorized Organization may assign named, individually authenticated staff. Effective staff capabilities are limited to the intersection of the parent OrganizerAuthority and explicit staff assignment. Staff cannot further delegate. Revocation of a staff assignment or suspension/expiry/revocation of the parent grant immediately blocks subsequent protected operations. Audit identifies the actual staff actor, Organization, Council, assessment and effective capabilities.

### Duration, renewal and emergency revocation

Each Council sets the grant duration subject to a platform-configured maximum. Renewal is automatic for the same council-defined duration, subject to the maximum and continued eligibility; renewal periods are audited. The Council and Organization receive notification 30 days before scheduled renewal/expiry. Notification does not require approval. During an emergency, a Council Administrator may immediately suspend/revoke authority for their own Council without second approval; a reason and immutable audit event are required. Dependent staff permissions are disabled immediately.

### Record retention and assessment ownership

Permanent deletion of assessment records, participation, candidates, marks, submissions, approvals, releases or audit history is prohibited. Use archival, status changes and correction/supersession while retaining original evidence and immutable audit history. Any lawful-disposal exception requires a separately governed policy.

Assessment.councilId is immutable during normal operations. Any exceptional transfer would require a separately designed process, explicit authorization from all affected Councils, independent approval, impact/reconciliation review and immutable audit records. No transfer capability is authorized.

### Cross-council consolidated reporting

Consolidated reporting is a separate derived reporting operation; it does not merge assessments or underlying records. Every Council whose data is included must explicitly authorize the report. Each authorization is limited to its purpose, approved fields, recipients and validity period. Identifiable learner/candidate-level data is excluded by default; including it requires explicit authorization from every affected Council. Report generation, access, export and download are scoped and audited. One Council cannot authorize access to another Council's data.

### Remaining work

The detailed authorization matrix, report schema and aggregation thresholds, recipient controls, retention schedule, full assessment workflow state machines and any exceptional transfer process remain to be designed. No Prisma schema change or migration is authorized.

## Council governance and independent approvals — accepted (23 November 2026)

Council governance is scoped to each Council. Multiple active Council Administrators are permitted, and each Council must maintain at least one active permanent CouncilGovernanceApprover. The distinct CouncilGovernanceApprover role handles sensitive governance approvals, including Council Administrator appointments, replacements, suspensions and removals. It is separate from CouncilApprover, which is limited to organizer RELEASE_RESULTS authority approval. Neither role implies general assessment or result-release execution permissions.

During onboarding, the Platform Administrator designates the initial permanent Governance Approver after verifying the Council's authorized representative. Subsequent appointments and sensitive administrator changes are initiated by a Council Administrator and require one independent approval from an eligible, active Governance Approver in the same Council. The approver must be a different individual from the requester and anyone directly affected. Holding multiple roles does not override separation of duties.

A Governance Approver must declare a conflict and recuse themselves from the affected request. A recused approver cannot access or decide that request. Another eligible Governance Approver may decide it; if none remains, the temporary Governance Approver recovery process applies. The Platform Administrator may restore permanent coverage after independently verifying the Council's authorized representative and may appoint a time-limited temporary approver when necessary. The temporary appointment has a defined expiry and is subject to a configurable maximum duration set by platform policy. If the vacancy or unavailability persists, it may be renewed only through a documented recovery decision by the Platform Administrator after independently verifying that the appointment remains necessary and the Council's authorized representative. Renewal establishes a new defined expiry within the platform maximum; it is not automatic. A temporary appointment never converts automatically into a permanent appointment. Appointment, each renewal decision and expiry are audited. While active, a temporary Governance Approver has the same narrowly defined approval permissions as a permanent CouncilGovernanceApprover, and no permissions beyond that role. The temporary approver cannot approve their own appointment or renewal and must recuse themselves from conflicted requests. Approval access ends immediately when the temporary appointment expires or is revoked.

Approvals, rejections, appointments, role changes, conflict declarations, recusals, emergency suspensions and recovery actions are audited. The audit identifies the actual individual, Council, request/action, timestamp, decision and reason where applicable. Urgent Platform Administrator suspension of a Council Administrator is temporary pending the governance process and does not itself constitute permanent removal.

**Implementation boundary:** these are accepted conceptual governance rules, not authorization to change the Prisma schema or run migrations. Detailed authorization matrices and workflow state machines remain design work.
