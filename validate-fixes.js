#!/usr/bin/env node

/**
 * TASKILO FIXES VALIDATION SCRIPT
 * Validates that all critical company-user structure problems are fixed
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TASKILO FIXES VALIDATION');
console.log('============================\n');

let issueCount = 0;
const issues = [];

// Check critical files for proper implementation
const criticalChecks = [
  {
    file: 'firebase_functions/src/triggers_firestore.ts',
    shouldContain: "user_type: userData.user_type || 'kunde'",
    description: 'Firebase Auth Trigger default should be kunde',
  },
  {
    file: 'src/app/register/company/step5/page.tsx',
    shouldContain: "updateDoc(doc(db, 'users', currentAuthUserUID)",
    description: 'Company registration should update users, not overwrite',
  },
  {
    file: 'src/app/register/company/step5/page.tsx',
    shouldContain: "user_type: 'firma'",
    description: 'Company registration should set correct user_type',
  },
  {
    file: 'src/app/api/project-requests/route.ts',
    shouldContain: "collection('companies')",
    description: 'Project requests should query companies collection',
  },
  {
    file: 'src/app/api/get-provider-info/route.ts',
    shouldContain: "db.collection('companies').doc(firebaseUserId).get()",
    description: 'Provider info should check companies collection first',
  },
];

console.log('🔍 Checking critical fixes...\n');

for (const check of criticalChecks) {
  const filePath = path.join(__dirname, check.file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(check.shouldContain)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description}`);
      issues.push(check.description);
      issueCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${check.file}`);
    issues.push(`File not found: ${check.file}`);
    issueCount++;
  }
}

console.log('\n🎯 VALIDATION RESULTS');
console.log('=====================');

if (issueCount === 0) {
  console.log('✅ ALL CRITICAL FIXES VALIDATED SUCCESSFULLY!');
  console.log('🚀 Ready for build and deployment');
} else {
  console.log(`❌ ${issueCount} CRITICAL ISSUES FOUND:`);
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log('\n🔧 Please fix these issues before building');
}

console.log(`\n📊 Status: ${issueCount === 0 ? 'READY' : 'NEEDS FIXES'}`);

process.exit(issueCount === 0 ? 0 : 1);
