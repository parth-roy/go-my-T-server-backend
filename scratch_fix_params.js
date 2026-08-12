const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/organization/presentation/controllers/team.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/const { branchId, departmentId } = req\.params;/g, 'const branchId = req.params.branchId as string;\n      const departmentId = req.params.departmentId as string;');
content = content.replace(/const { branchId, departmentId, teamId } = req\.params;/g, 'const branchId = req.params.branchId as string;\n      const departmentId = req.params.departmentId as string;\n      const teamId = req.params.teamId as string;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed type errors');
