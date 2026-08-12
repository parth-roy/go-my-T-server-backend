# Organization Domain Specification v1.0

## Purpose
The Organization Domain exists to model, manage, and govern the complex hierarchies, collaborations, and workforce distributions of B2B entities on the Parther Logistics platform. It serves as the business foundation for allowing enterprises, companies, vendors, and contractors to operate securely, invite members, delegate responsibilities, and deploy labor across a unified logistics network.

---

## Goals
- **Structural Integrity**: Accurately model real-world business structures (Companies, Branches, Departments, Teams).
- **Workforce Management**: Seamlessly handle the employment, deployment, and verification of Workers.
- **Secure Delegation**: Provide strict role-based access control (Primary Owner, Admin, Supervisor, Employee) within an organization.
- **Inter-organizational Collaboration**: Enable secure B2B networking where distinct organizations (e.g., Enterprise and Vendor) can collaborate on projects or share shifts.
- **Independence & Mobility**: Ensure workers can transition smoothly between being independently contracted and formally employed by an organization.

---

## Non Goals
- **Not a Payroll System**: This domain dictates *who* works where, not how their external fiat salaries are processed or taxed.
- **Not a Booking Engine**: It manages the structure of the entities that execute bookings, but does not manage the state machine of the logistics loads themselves.
- **Not Technical Implementation**: This document does not dictate database schemas, API routes, or UI state management.

---

## Business Definitions

- **Organization**: The top-level business entity in the ecosystem. It acts as the legal and structural umbrella for all sub-entities, members, and assets.
- **Company**: A standard classification of an Organization representing a formalized corporate entity.
- **Contractor**: An Organization classification representing a smaller business or sole proprietorship that provides dedicated services.
- **Vendor**: An Organization classification that supplies specific logistical assets or labor to other organizations.
- **Worker**: A human laborer utilizing the platform to execute physical logistics tasks. 
- **Independent Worker**: A Worker who operates autonomously on the platform and is not currently bound by an active Employment relationship with any Organization.
- **Branch**: A geographical or operational subdivision of an Organization.
- **Department**: A functional subdivision within a Branch or Organization (e.g., "Heavy Dispatch", "Warehouse Labor").
- **Team**: A granular group of Workers organized for specific, localized objectives.
- **Project**: A temporary or long-term operational initiative that requires the collaboration of Teams, Workers, and potentially multiple Organizations.
- **Shift**: A defined block of time during which a Worker is scheduled to provide labor for their Organization or a collaborative Project.
- **Collaboration**: A formal, accepted relationship between two distinct Organizations allowing them to share Projects, Shifts, or visibility.
- **Organization Member**: Any human user who has accepted an Invitation and holds a formal role within an Organization.
- **Primary Owner**: The ultimate authority and legal owner of an Organization. Holds absolute destructive and administrative capabilities.
- **Organization Admin**: A highly trusted member delegated broad capabilities to manage Branches, Departments, Teams, and standard Members.
- **Supervisor**: A mid-level member responsible for overseeing Teams, assigning Shifts, and managing day-to-day Worker output.
- **Employee**: A standard Organization Member bound by an Employment relationship, possessing no administrative capabilities.
- **Verification**: The business process of proving the legal, operational, or physical legitimacy of an Organization or a Worker (e.g., identity, background checks).
- **Capabilities**: Specific, granular actions an Organization Member is authorized to perform (e.g., "Can Invite Workers", "Can Delete Branch").
- **Invitation**: A secure, time-bound business request sent by an Organization to bring a user into the hierarchy.
- **Employment**: The active, binding relationship between a Worker and an Organization. 

---

## Business Rules

1. **Absolute Ownership**: Every Organization must have exactly one, and only one, Primary Owner at all times.
2. **Exclusive Employment**: A Worker can only have one active Employment relationship with one Organization at a time. 
3. **Independent Reversion**: If a Worker is terminated or leaves an Organization, they immediately regain "Independent Worker" status.
4. **B2B Collaboration**: Organizations may form Collaborations with other Organizations (e.g., a Company hiring a Vendor). Collaborations require mutual consent (dual opt-in).
5. **Hierarchical Inheritance**: Capabilities granted at the Organization level cascade down. Capabilities granted at a Branch level do not grant access to sibling Branches.
6. **Immutable History**: Employment transitions, Verification statuses, and Collaboration agreements must be auditable. They are appended, never silently overwritten.
7. **Verification Gate**: An Organization cannot dispatch Workers to platform-wide loads unless the Organization itself has passed Verification.
8. **Invitation Expiry**: Unaccepted Invitations naturally expire and do not consume organizational seat limits.
9. **No Ghost Teams**: A Team must belong to a Department, Branch, or directly to an Organization. It cannot exist orphaned.

---

## Lifecycle

### Organization Lifecycle
1. **Formation**: Created by a Primary Owner. Begins in an "Unverified" state.
2. **Verification**: Submits legal documentation. Transitions to "Verified" upon approval.
3. **Operation**: Actively manages Branches, employs Workers, and engages in Collaborations.
4. **Suspension/Dissolution**: Can be suspended by platform admins for violations, or dissolved by the Primary Owner (which forces all Employees back to Independent status).

### Membership / Invitation Lifecycle
1. **Invited**: Organization Admin issues an Invitation to a phone number/user.
2. **Pending**: The user reviews the Invitation terms.
3. **Accepted/Rejected**: User accepts (becoming an Employee/Member) or rejects.
4. **Active**: Member operates within their Capabilities.
5. **Terminated/Resigned**: The Membership ends. Capabilities are immediately revoked.

### Verification Lifecycle
1. **Unverified**: Default state.
2. **Pending Review**: Documents submitted, awaiting automated or manual clearance.
3. **Verified**: Cleared for full platform capabilities.
4. **Revoked**: Verification stripped due to expiry, audit failure, or violations.

---

## Actors

- **Primary Owner**
  - *Responsibilities*: Ultimate legal responsibility, billing, Organization dissolution, transferring ownership.
  - *Ownership*: Owns the Organization entirely.
- **Organization Admin**
  - *Responsibilities*: Managing structure (Branches/Departments), mass hiring/firing, setting Capabilities for Supervisors.
  - *Ownership*: Operates on behalf of the Primary Owner.
- **Supervisor**
  - *Responsibilities*: Managing Teams, scheduling Shifts, tracking Project progression.
  - *Ownership*: Owns the localized operations of their assigned Team.
- **Employee / Worker**
  - *Responsibilities*: Executing Shifts, fulfilling physical logistics tasks.
  - *Ownership*: Owns their own labor output and personal Verification status.

---

## Relationships

- **Organization ➔ Branch ➔ Department ➔ Team**: A strict top-down structural containment hierarchy.
- **Organization ➔ Organization (Collaboration)**: A peer-to-peer relationship allowing asset/labor visibility.
- **Organization ➔ Worker (Employment)**: A parent-child relationship where the Organization dictates the Worker's Shifts and Capabilities.
- **Team ➔ Worker**: A grouping relationship. Workers can belong to multiple Teams within their active Organization.
- **Project ➔ Shift**: Projects generate demand blocks, which are fulfilled by Shifts.
- **Worker ➔ Shift**: A fulfillment relationship. A Worker executes a Shift.

---

## Constraints

- A Worker **MUST NOT** be employed by Organization A and Organization B simultaneously.
- A Primary Owner **MUST NOT** be demoted or removed unless Ownership is explicitly transferred to another user first.
- A Collaboration **MUST NOT** expose private Capabilities (like hiring/firing) between the two Organizations; it only exposes shared Projects and agreed Shifts.
- An Organization **MUST NOT** dispatch a Worker whose personal Verification is Revoked, even if the Organization is Verified.

---

## Open Questions

1. **Collaboration Billing**: When Company A collaborates with Vendor B, which Organization handles the platform billing for the Shifts executed by Vendor B's Workers?
2. **Cross-Branch Mobility**: Can an Employee belong to a Team in Branch X, but temporarily pick up a Shift for Branch Y?
3. **Role Customization**: Are "Admin", "Supervisor", and "Employee" rigidly fixed templates, or can Organizations create Custom Roles with granular Capability toggles?
4. **Independent Worker visibility**: Can Organizations browse a public directory of Independent Workers to send Invitations, or must they know the Worker's contact details beforehand?
