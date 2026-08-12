const fs = require('fs');

const oldSchema = fs.readFileSync('d:/Projects/Parther_Technologies/logistic/server/prisma/schema_old.prisma', 'utf-8');
const activeSchema = fs.readFileSync('d:/Projects/Parther_Technologies/logistic/server/prisma/schema.prisma', 'utf-8');

// The required models according to phase 2
const targetModels = [
  'enum OrganizationType',
  'enum OrganizationStatus',
  'enum OrgVerifStatus',
  'enum OrganizationRole',
  'enum MembershipStatus',
  'enum BranchStatus',
  'enum DepartmentStatus',
  'enum TeamStatus',
  'enum DesignationStatus',
  'enum EmploymentCategory',
  'enum EmploymentAssignmentStatus',
  'enum EmploymentTransitionReason',
  'enum ShiftGenerationTrigger',
  'enum ShiftGenerationJobStatus',
  'enum ShiftLifecycleStatus',
  'enum ShiftOverrideStatus',
  'enum ShiftEventType',
  'model Organization',
  'model OrganizationMembership',
  'model OrganizationMembershipInvitation',
  'model OrganizationBranch',
  'model OrganizationDepartment',
  'model OrganizationTeam',
  'model OrganizationDesignation',
  'model OrganizationEmploymentType',
  'model OrganizationEmploymentAssignment',
  'model WorkScheduleTemplate',
  'model WorkScheduleTemplateVersion',
  'model ShiftGenerationJob',
  'model ShiftInstance',
  'model ShiftOverride',
  'model ShiftTimelineEvent'
];

let extraction = '';

targetModels.forEach(keyword => {
  const startIdx = oldSchema.indexOf(keyword + ' {');
  if (startIdx !== -1) {
    const nextCurlyIdx = oldSchema.indexOf('\n}', startIdx);
    extraction += oldSchema.substring(startIdx, nextCurlyIdx + 2) + '\n\n';
  } else {
      console.log('Missed', keyword);
  }
});

// Update User
const userRelations = `
  orgCreated        Organization[] @relation("OrgCreatedBy")
  orgVerified       Organization[] @relation("OrgVerifiedBy")
  memberships       OrganizationMembership[]
  branchManaged     OrganizationBranch[] @relation("BranchManager")
  departmentManaged OrganizationDepartment[] @relation("DepartmentManager")
  teamLed           OrganizationTeam[] @relation("TeamLeader")
`;

let updatedSchema = activeSchema.replace(
  '  whatsappOptIn   Boolean @default(true)', 
  '  whatsappOptIn   Boolean @default(true)\n' + userRelations
);

updatedSchema += '\n// --- RESTORED ORGANIZATION MODELS ---\n' + extraction;

fs.writeFileSync('d:/Projects/Parther_Technologies/logistic/server/prisma/schema.prisma', updatedSchema);
console.log('Done modifying schema.prisma');
