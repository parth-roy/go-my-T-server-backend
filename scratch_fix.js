const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/modules/organization/application/use-cases');
const files = fs.readdirSync(dir).filter(f => f.includes('team.use-case.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/const organizationId = context\.organizationId;/g, 'const organizationId = context.organization!.id;');
  content = content.replace(/context\.membership\.role/g, 'context.platformIdentity.role');
  content = content.replace(/department\.getStatus\(\)/g, 'department.status');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix team.router.ts
const routerPath = path.join(__dirname, 'src/modules/organization/presentation/team.router.ts');
let routerContent = fs.readFileSync(routerPath, 'utf8');
routerContent = routerContent.replace(/PrismaOrganizationMembershipRepository/g, 'OrganizationMembershipRepository');
fs.writeFileSync(routerPath, routerContent, 'utf8');

console.log('Fixed use cases and router.');
