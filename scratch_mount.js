const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/organization/presentation/organization.router.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { branchRouter } from './branch.router';",
  "import { branchRouter } from './branch.router';\nimport { designationRouter } from './designation.router';"
);

content = content.replace(
  "organizationRouter.use('/members', membershipRouter);",
  "organizationRouter.use('/members', membershipRouter);\n\n// M6: Designation sub-router\norganizationRouter.use('/:organizationId/designations', designationRouter);"
);

fs.writeFileSync(filePath, content, 'utf8');
