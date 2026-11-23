# CBE Platform — Domain Model Baseline

**Status:** Proposed engineering baseline; not yet a migration-ready schema  
**Repository:** Navakholo  
**Branch:** foundation/domain-model

## 1. Purpose

This document establishes the domain boundaries and modelling rules for the CBE interschool examination platform. It is deliberately conceptual. The current Prisma schema is an implementation starting point, not proof that the full domain or tenancy model is complete.

## 2. Product and tenancy boundary

The platform supports multiple independent examination councils. A council is the proposed tenant owner of its configuration and operational data. A school is a canonical institution identity and may participate in assessments organised by different eligible organisations without being duplicated.

Do not assume the council and an assessment organiser are always the same legal or operational entity. Model the organiser explicitly and represent its authority to run an assessment.

**Tenant invariant:** every tenant-owned read, write, export, report, background job and aggregate must be scoped using verified server-side authorization context. Never trust a tenant identifier supplied only by the browser.

## 3. Bounded contexts

| Context | Main concepts | Responsibility |
|---|---|---|
| Platform | PlatformOperator, PlatformPolicy | Platform-level oversight and controlled support |
| Tenant | Council, CouncilSettings, CouncilMembership | Council identity, configuration and tenant boundary |
| Organisation | Organizer, OrganizerMembership | Organisations authorised to organise assessments |
| Geography | Region, County, Subcounty, Zone, Cluster | Council-owned geography |
| Institution | School, SchoolCouncilRegistration | Canonical school identity and council-specific registration |
| Identity & access | User, Role, Permission, TeacherIdentity | Login identity and authorization |
| School staffing | SchoolMembership, StaffAssignment | School-specific association and duties |
| Curriculum | Curriculum, Grade, LearningArea, GradeLearningArea, GradingRubric, RubricLevel | Curriculum and grade-specific learning areas/grading |
| Assessment | Assessment, AssessmentPeriod, AssessmentConfiguration, EntryWindow | Assessment definition and operational rules |
| Participation | AssessmentInvitation, SchoolParticipation | School participation in an organiser's assessment |
| Candidates | LearnerIdentity, CandidateEnrollment, AssessmentCandidate | Learner identity and assessment-specific registration |
| Marks | Mark, MarkRevision, MarkEntryBatch | Numerical marks, correction history and entry batches |
| Governance workflow | SchoolSubmission, SubmissionIssue, Review, Approval, ResultRelease | Validation, submission, approval and release |
| Results | Result, CandidateRank, SchoolSummary, AnalyticsSnapshot | Reproducible result and analytics outputs |
| Governance & operations | AuditEvent, Notification, ExportJob | Accountability and operational work |

These are candidate boundaries, not a command to create one table per concept. Aggregate and persistence boundaries require validation.

## 4. Identity and membership rules

### Users and roles
- School-level actors are School Administrators and Teachers.
- Platform Administrators are provisioned through a controlled developer/platform process; they are not ordinary school users.
- Learners do not authenticate and do not have user accounts.
- Authorization is capability- and scope-based. Role names alone are insufficient to describe every permission.

### School registration and administration
- A person registering a school becomes its initial School Administrator.
- The school and initial administrator remain pending until a Platform Administrator approves the school.
- Pending schools cannot perform school-management operations or provision users.
- After approval, the School Administrator manages the school and can initiate replacement/change of the School Administrator role-holder.
- Platform Administrators approve and oversee; they do not routinely operate school workflows.

### Teachers
- Teacher identity is global and must not be duplicated when the same teacher works across multiple schools.
- A School Administrator may create a teacher identity or attach an existing teacher identity to the school.
- School membership and assignment are separate from the global teacher identity.
- A teacher may have memberships/assignments in multiple schools.

### Learners
- Learner identity is system-wide and has a unique learner identifier.
- The identifier is not an authentication secret.
- A learner is registered as a candidate for a particular assessment/period; do not assume every learner participates in every assessment.
- Candidate registration must preserve the learner's canonical identity while capturing assessment-specific facts needed for reporting.

## 5. Geography and school identity

The agreed hierarchy is:

Council → Region → County → Subcounty → Zone → Cluster → School

The council owns its geography. School identity should not be coupled to an assessment. A school may be associated with more than one council only if the business rules explicitly permit it; that relationship must be represented rather than copying the school record.

## 6. Assessment and result lifecycle

Assessment setup must define at least:
- organiser and owning council/tenant;
- assessment type (internal or external/inter-school);
- period/year and applicable grades;
- curriculum and grade-specific learning areas;
- participating-school rules;
- candidate registration window;
- mark-entry window and mark constraints;
- grading rubric version;
- submission, review, approval and release policy.

Internal assessment governance currently calls for platform-administrator approval before a school administrator releases results. External/inter-school assessment governance calls for participating schools to submit data, followed by organiser validation and release. These flows need explicit state machines and confirmation of exact actor permissions before implementation.

Marks are final numerical totals per learning area in the current scope. Strands, substrands, outcomes and evidence capture are outside the current marks model.

## 7. Data integrity and tenant isolation

The logical and physical designs must address:
- composite uniqueness within the correct tenant/owner scope;
- foreign keys that prevent cross-tenant relationship creation;
- assessment candidate uniqueness and learner deduplication;
- mark uniqueness per candidate and learning area;
- grade-to-learning-area configuration;
- rubric versioning so historical results remain reproducible;
- transactional submission and approval transitions;
- immutable or append-only mark correction history;
- audit coverage for privileged and data-changing actions;
- consistent authorization for API responses, exports, analytics and background jobs.

Consider PostgreSQL Row Level Security only as defence in depth after evaluating Prisma connection/session context and transaction handling. It does not replace application authorization.

## 8. Existing schema gap assessment

The current Prisma schema includes geography, schools, users, assessments, subjects, exam candidates and scores. It does not yet express the complete council/organiser tenancy model, school approval lifecycle, global teacher identity and memberships, school participation, candidate identity separation, mark revisions, submission workflow, approvals or result releases.

The existing schema should therefore not be extended with an unreviewed one-shot migration. First produce a logical ERD, data dictionary, ownership matrix and migration plan. Preserve working application behavior while changes are staged.

## 9. Decisions still requiring validation

The following remain open and must not be silently assumed:

1. Canonical school identity authority, global identifiers and duplicate-school reconciliation.
2. Whether a school that leaves and later rejoins a council reactivates its existing CouncilSchoolRegistration or receives a new historical registration episode.
3. Whether the initial School Administrator is represented as a pending user, invitation or provisional membership.
4. Exact assessment approval/release transitions, including internal versus external workflows and separation of approval from publication.
5. Verified identifier(s) for global TeacherIdentity and the duplicate-resolution process.
6. Authoritative learner identifier issuer, correction/merge process and whether multiple candidate entries per learner are allowed for papers/sessions.
7. Applicable privacy obligations, retention schedule, lawful disposal, data residency and export policy. Ordinary permanent deletion of assessment evidence and audit history is prohibited; any lawful disposal exception requires a separately governed policy.
8. Expected scale, availability, offline requirements and external integrations.
9. Detailed workflow, eligible approver roles and impact controls for any exceptional assessment ownership transfer. No transfer capability is authorized.
10. Consolidated-report schema, permitted aggregation thresholds, approved recipient model, report retention and exact audit event fields. The authorization boundary itself is accepted: every affected Council must explicitly authorize the report.

Resolved decisions are recorded in Sections 2, 5, 6 and 11 and in the conceptual/logical design documents. Do not re-open them as unresolved questions without a new product-owner decision.

## 10. Implementation sequence
1. Confirm domain terminology, actors and ownership.
2. Approve tenant and organiser relationship model.
3. Draw conceptual and logical ERDs.
4. Define data dictionary and composite constraints.
5. Specify lifecycle/state machines and authorization matrix.
6. Review API contracts and transaction boundaries.
7. Produce additive migration and data backfill plan.
8. Implement one bounded context at a time with isolation tests.

## References
- Notion: CBE Engineering Workspace — project baseline and lifecycle.
- Notion: 04 — System Architecture, Domain, Data & API Design.
- Notion: 14 — Domain Modelling & Database Design.

## 11. Organizer authority and cross-council coordination — accepted (2026-11-23)

An independent organizer may coordinate an examination involving schools registered under multiple Councils only by coordinating separate assessments—one assessment owned by each participating Council. Every Assessment has exactly one immutable owning Council. Participation, candidates, marks, submissions, approvals and result releases remain council-specific. A shared/multi-council Assessment is not permitted.

### Council-scoped OrganizerAuthority

Each Council independently grants an OrganizerAuthority to an Organization. Council A's grant confers no access or authority under Council B. The organizer is a delegated actor, not a tenant owner. Grants may be assessment-specific (the default) or council-wide (only when explicitly selected), and must define permitted capabilities, status and validity interval.

A Council Administrator with active membership may grant, modify and revoke authority only for their own Council. The independently assignable capability dimensions are:
- create/coordinate assessments;
- manage invitations and participating schools;
- manage candidate and participation records;
- validate submissions and marks and resolve validation issues;
- release results.

Every protected operation—including background jobs, exports, downloads and staff actions—must re-check the active parent grant, its Council, scope, capability and validity. Client-supplied tenant IDs or stale tokens are not authorization.

### Independent approval and staff delegation

Granting or changing RELEASE_RESULTS requires initiation by a Council Administrator and approval by a distinct active Council Approver for that same Council. Self-approval is prohibited even if one person holds multiple roles. Pending changes are ineffective until approved. Capability reductions/revocations remain immediately executable by an authorized Council Administrator. Council Approver conveys approval authority only; it does not itself authorize assessment management or result-release execution.

An authorized Organization may assign named, individually authenticated staff to act within the parent OrganizerAuthority. Each staff member's effective permissions are the intersection of parent-granted capabilities and explicitly assigned staff capabilities. Staff cannot further delegate. Parent suspension, expiry or revocation and staff-assignment revocation immediately block subsequent protected operations. Audit records identify the actual staff actor and effective scope.

### Duration, renewal, notifications and emergency revocation

Each Council chooses the grant duration, subject to a platform-configured maximum. OrganizerAuthority renews automatically for the same council-defined duration, subject to the maximum and continued eligibility. Renewal periods and effective dates are audited. The Council and Organization receive advance notification 30 days before scheduled renewal/expiry; notification does not create an approval step.

A Council Administrator may immediately suspend or revoke an OrganizerAuthority for their own Council during an emergency without second approval. A reason is required and an immutable audit event records actor, Council, Organization, scope, action, timestamp and reason. Dependent staff permissions are disabled immediately.

### Sensitive records and ownership safeguards

- Permanently deleting assessment records, participation, candidates, marks, submissions, approvals, releases or audit history is prohibited. Use archival, status transitions and correction/supersession while preserving original records and immutable audit history. Any lawful-disposal exception requires a separately governed policy.
- Assessment.councilId is immutable in normal operations. Any exceptional transfer would require a separately designed process, explicit authorization from every affected Council, independent approval by authorized officials, impact/reconciliation review and immutable audit records. No transfer capability is currently authorized.

### Cross-council consolidated reporting

A consolidated report is a separate, derived reporting operation; it never merges assessments or underlying tenant-owned records. Every Council whose data is included must explicitly authorize the report. Each authorization is limited to the stated purpose, approved fields, recipients and validity period. Identifiable learner/candidate-level data is excluded by default; including it requires explicit authorization from every affected Council. Report creation, access, export and download must be scoped and audited. One Council's authorization cannot authorize another Council's data.

### Remaining design work

The authorization matrix, detailed report schema/aggregation safeguards, exact report-recipient controls, exceptional transfer workflow (if ever needed), privacy/retention schedule and full workflow state machines remain to be completed. No Prisma schema change, migration or transfer capability is authorized by this decision.


## 17. Council governance and independent approvals — accepted (23 November 2026)

### Council-scoped governance roles

- Multiple active Council Administrators are permitted within one Council. Their permissions are Council-scoped; none may act for another Council without active authority there.
- Introduce a distinct `CouncilGovernanceApprover` role for sensitive Council governance decisions, including Council Administrator appointments, replacements, suspensions and removals. This role is separate from `CouncilApprover`, which is limited to approving/rejecting organizer `RELEASE_RESULTS` authority requests.
- A CouncilGovernanceApprover receives no automatic assessment-management, organizer-management, organizer-release approval or result-release execution permissions.
- A person may hold both CouncilAdministrator and CouncilGovernanceApprover roles in the same Council, but role overlap never overrides separation of duties.
- Each Council must maintain at least one active permanent CouncilGovernanceApprover. The system must flag a Council without one. A temporary appointment covers a vacancy but does not count as permanent coverage.

### Appointment, replacement and recovery

- During Council onboarding, the Platform Administrator designates the initial permanent CouncilGovernanceApprover after independently verifying the Council's authorized representative.
- A subsequent appointment is initiated by a Council Administrator and approved by an existing active CouncilGovernanceApprover. The requester cannot approve their own request.
- A Council Administrator may initiate appointment/replacement, suspension or removal of another Council Administrator; an active, eligible CouncilGovernanceApprover must independently approve. The affected administrator cannot approve a decision directly affecting their own administrative authority.
- One independent approval by a distinct, eligible Governance Approver is the standard approval threshold for these sensitive governance requests. The approver must be active in the same Council, not the requester, not the affected person, and not conflicted.
- If no permanent Governance Approver remains, the Platform Administrator may restore coverage after independently verifying the Council's authorized representative. The Platform Administrator may appoint a temporary Governance Approver when the permanent approver is unavailable or the position is vacant. A temporary appointment is Council-scoped, has a defined expiry, is subject to a configurable platform maximum duration, and confers only Governance Approver permissions. If the vacancy or unavailability persists, renewal requires a documented recovery decision by the Platform Administrator after independently verifying that the appointment remains necessary and the Council's authorized representative. Each renewal establishes a new defined expiry within the platform maximum; renewal is not automatic. A temporary appointment never converts automatically into a permanent appointment. Appointment, each renewal decision and expiry are audited.
- In urgent security situations, the Platform Administrator may temporarily suspend a Council Administrator pending the governance process. The action requires a reason, timestamp and audit record and is not permanent removal by itself.
- Normal operations must retain at least one active Council Administrator. Platform Administrator recovery applies if the Council loses all active administrators.

### Conflict of interest and audit

- A Governance Approver must declare a conflict of interest and recuse themselves from the affected request. A recused approver cannot access or decide that request.
- Another active, eligible Governance Approver may decide it. If none remains, use the temporary Governance Approver recovery process.
- Conflict declaration, recusal, appointment, approval, rejection, suspension, revocation and recovery actions are audited. The audit record identifies the actual person, Council, request/action, timestamp, decision and reason where applicable.
- Separation of duties is checked against the actual individual, not merely role assignments. A person cannot approve a request they initiated or a decision directly affecting their own appointment or administrative authority.

### Council membership and invitations

- A Council Administrator may invite existing platform users into their Council, assign permitted Council-scoped roles, suspend/reactivate memberships and revoke memberships. They cannot create/assign Platform Administrators, grant roles in another Council, self-assign additional privileged roles or bypass independent approval.
- An invitation to an existing user creates a Council membership, not a duplicate identity. An invitation to a new user is Council-specific; the recipient verifies it and creates a global account before the membership becomes active.
- Invitations expire and may be revoked. An invitation alone grants no active access. Acceptance, expiry, revocation, membership changes and role changes are audited.
- Council Administrator appointment/replacement is initiated by an existing Council Administrator and requires independent approval as described above.

### Council school registration administration

A Council Administrator may suspend/reactivate a CouncilSchoolRegistration only within their own Council. This does not deactivate the canonical School or affect its registrations with other Councils. Suspension requires a reason and is audited; it blocks participation in that Council's assessments while suspended. Reactivation restores eligibility subject to other requirements. Permanent deletion is not an ordinary administrative operation. Platform Administrator approval remains required for initial school registration.

**Implementation boundary:** these are accepted governance rules, not approval to modify the Prisma schema or run migrations. Detailed authorization matrix, exact workflow state machines and physical persistence design remain open.
