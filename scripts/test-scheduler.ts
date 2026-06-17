/**
 * Test script to verify scheduler functionality
 * This tests the cron scheduling without actually starting the server
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

import cron from 'node-cron';
import { SCHEDULE_PATTERNS, getAvailableSchedules, getSchedulerStatus } from '../src/config/scheduler.js';

console.log('⏰ Testing Scheduler Functionality\n');
console.log('='.repeat(60));

console.log('\n1️⃣  Validating Cron Patterns...');
let allValid = true;

Object.keys(SCHEDULE_PATTERNS).forEach((key) => {
  const pattern = SCHEDULE_PATTERNS[key as keyof typeof SCHEDULE_PATTERNS];
  const isValid = cron.validate(pattern);
  console.log(`  ${isValid ? '✓' : '✗'} ${key}: ${pattern} - ${isValid ? 'VALID' : 'INVALID'}`);
  if (!isValid) allValid = false;
});

if (allValid) {
  console.log('\n✅ All cron patterns are valid!');
} else {
  console.error('\n❌ Some cron patterns are invalid!');
  process.exit(1);
}

console.log('\n2️⃣  Testing Schedule Descriptions...');
const schedules = getAvailableSchedules();
console.log(`  Found ${schedules.length} available schedules:`);
schedules.forEach((schedule) => {
  console.log(`  ✓ ${schedule.name}: ${schedule.description} (${schedule.days} days)`);
});

console.log('\n3️⃣  Testing Scheduler Status...');
const status = getSchedulerStatus();
console.log('  Configuration:');
console.log('    - Enabled:', status.enabled);
console.log('    - Frequency:', status.frequency);
console.log('    - Days:', status.days);
console.log('    - Recipients:', status.recipients.length);
console.log('    - Timezone:', status.timezone);
console.log('    - Active Tasks:', status.activeTasks.length);

console.log('\n4️⃣  Testing Cron Execution (2-second test)...');

let executionCount = 0;
const testPattern = '*/2 * * * * *';

console.log('  Starting test cron job (will run for 6 seconds)...');

const testTask = cron.schedule(testPattern, () => {
  executionCount++;
  console.log(`  ✓ Cron executed (run #${executionCount}) at ${new Date().toLocaleTimeString()}`);
});

setTimeout(() => {
  testTask.stop();

  if (executionCount >= 2) {
    console.log(`\n✅ Cron execution test passed! (${executionCount} executions)`);
  } else {
    console.error(`\n❌ Cron execution test failed! Only ${executionCount} executions`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All scheduler tests passed!\n');

  console.log('💡 Next Steps:');
  console.log('  1. Set LOG_REPORT_ENABLED=true in .env');
  console.log('  2. Configure SMTP settings for email');
  console.log('  3. Set LOG_REPORT_RECIPIENTS with your email');
  console.log('  4. Start the server with: npm start');
  console.log('  5. Check logs for: "Log report scheduler started"\n');

  process.exit(0);
}, 6000);
