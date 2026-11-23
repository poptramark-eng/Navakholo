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
1. Whether schools can be registered with more than one council and what the canonical school authority is.
2. Whether organisers are always councils or may be independent organisations.
3. The Council Administrator is authorized to create assessments for their own council, subject to an active Council Administrator membership. Other platform-admin, school-admin and organiser permissions remain to be specified.
4. Whether the initial school administrator is represented as a pending user, invitation or provisional membership.
5. Exact assessment approval/release transitions and separation of approval from publication.
6. Learner identifier format, issuer, correction and merge procedure.
7. Applicable privacy law, retention, data residency and deletion obligations.
8. Expected scale, availability, offline requirements and external integrations.

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