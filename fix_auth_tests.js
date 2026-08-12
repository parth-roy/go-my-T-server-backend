const fs = require('fs');
const file = 'src/modules/time-tracking/infrastructure/__tests__/auth/RealPerformanceAuthorizationService.integration.spec.ts';
let s = fs.readFileSync(file, 'utf8');

s = s.replace(/, type: 'FLEET'/g, '');
s = s.replace(/role: 'WORKER'/g, "role: 'EMPLOYEE'");
s = s.replace(/rootRole:/g, 'role:');
s = s.replace(/user\.rootRole/g, 'user.role');

fs.writeFileSync(file, s);
console.log('Fixed auth test');
