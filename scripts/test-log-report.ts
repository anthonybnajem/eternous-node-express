/**
 * Test script for log reporting system
 * This verifies all imports and basic functionality
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

import { generateLogSummary, getSystemMetrics } from '../src/services/logReport.service.ts';
import { generateEmailTemplate } from '../src/services/emailReport.service.ts';
import { getSchedulerStatus, getAvailableSchedules } from '../src/config/scheduler.ts';
import config from '../src/config/config.ts';

console.log('🧪 Testing Log Reporting System\n');
console.log('='.repeat(50));

console.log('\n✓ Test 1: All imports successful');

console.log('\n📋 Test 2: Configuration');
console.log('  - Log Report Enabled:', config.logReport.enabled);
console.log('  - Frequency:', config.logReport.frequency);
console.log('  - Days:', config.logReport.days);
console.log('  - Recipients:', config.logReport.recipients.join(', ') || 'None configured');
console.log('  - Timezone:', config.logReport.timezone);

console.log('\n⏰ Test 3: Available Schedules');
const schedules = getAvailableSchedules();
schedules.forEach((schedule) => {
  console.log(`  - ${schedule.name}: ${schedule.description}`);
});

console.log('\n💻 Test 4: System Metrics');
try {
  const metrics = getSystemMetrics();
  console.log('  ✓ Uptime:', metrics.uptime);
  console.log('  ✓ Memory RSS:', metrics.memory);
  console.log('  ✓ Node Version:', metrics.nodeVersion);
  console.log('  ✓ Platform:', metrics.platform);
} catch (error) {
  console.error('  ✗ Error getting system metrics:', error instanceof Error ? error.message : error);
}

console.log('\n📊 Test 5: Log Aggregation');
try {
  const summary = await generateLogSummary(7);
  console.log('  ✓ Report period:', summary.period.from, 'to', summary.period.to);
  console.log('  ✓ Total logs:', summary.summary?.totalLogs);
  console.log('  ✓ Error count:', summary.summary?.errorCount);
  console.log('  ✓ Warning count:', summary.summary?.warningCount);
  console.log('  ✓ Error rate:', summary.summary?.errorRate + '%');
  console.log('  ✓ Health status:', summary.summary?.healthStatus);

  console.log('\n📧 Test 6: Email Template Generation');
  const emailHtml = generateEmailTemplate(summary as never);
  console.log('  ✓ Email template generated');
  console.log('  ✓ Template length:', emailHtml.length, 'characters');
  console.log('  ✓ Contains HTML:', emailHtml.includes('<!DOCTYPE html>'));
  console.log('  ✓ Contains health status:', emailHtml.includes(String(summary.summary?.healthStatus)));
} catch (error) {
  console.error('  ✗ Error in log aggregation:', error instanceof Error ? error.message : error);
  console.error('  Stack:', error);
}

console.log('\n🔧 Test 7: Scheduler Status');
try {
  const status = getSchedulerStatus();
  console.log('  - Enabled:', status.enabled);
  console.log('  - Frequency:', status.frequency);
  console.log('  - Days:', status.days);
  console.log('  - Recipients:', status.recipients.length);
  console.log('  - Timezone:', status.timezone);
  console.log('  - Active Tasks:', status.activeTasks.length);
} catch (error) {
  console.error('  ✗ Error getting scheduler status:', error instanceof Error ? error.message : error);
}

console.log('\n' + '='.repeat(50));
console.log('✅ All tests completed!\n');
process.exit(0);
