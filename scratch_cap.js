const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/organization/domain/services/capability-resolver.domain-service.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/, 'LIST_TEAMS'/g, ", 'LIST_TEAMS',\n          'CREATE_DESIGNATION', 'UPDATE_DESIGNATION', 'ARCHIVE_DESIGNATION', 'VIEW_DESIGNATION', 'LIST_DESIGNATIONS'");
content = content.replace(/, 'LIST_TEAMS'\)/g, ", 'LIST_TEAMS', 'VIEW_DESIGNATION', 'LIST_DESIGNATIONS')");

fs.writeFileSync(filePath, content, 'utf8');
