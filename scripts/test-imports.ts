/**
 * Test script to verify all imports can be resolved
 * This does NOT start the server, just verifies all modules can be loaded
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

console.log('🔍 Testing all imports...\n');
console.log('='.repeat(60));

let errors: Array<{ module: string; error: string }> = [];
let success = 0;

console.log('\n📦 Importing main app module...');
try {
  await import('../src/app');
  console.log('✅ App module loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load app module:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/app', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n⚙️  Importing config module...');
try {
  await import('../src/config/config');
  console.log('✅ Config module loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load config module:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/config/config', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n⏰ Importing scheduler module...');
try {
  await import('../src/config/scheduler');
  console.log('✅ Scheduler module loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load scheduler module:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/config/scheduler', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n🔧 Importing services...');
try {
  await import('../src/services/index');
  console.log('✅ All services loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load services:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/services/index', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n📊 Importing models...');
try {
  await import('../src/models/index');
  console.log('✅ All models loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load models:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/models/index', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n🛣️  Importing routes...');
try {
  await import('../src/routes/v1/index');
  console.log('✅ All routes loaded successfully');
  success++;
} catch (error) {
  console.error('❌ Failed to load routes:', error instanceof Error ? error.message : error);
  errors.push({ module: 'src/routes/v1/index', error: error instanceof Error ? error.message : String(error) });
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 Test Summary:');
console.log(`  ✅ Successful: ${success}`);
console.log(`  ❌ Failed: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n🔴 Errors Found:');
  errors.forEach((err, index) => {
    console.log(`\n  ${index + 1}. Module: ${err.module}`);
    console.log(`     Error: ${err.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All imports resolved successfully!');
  console.log('\n💡 The application is ready to start.');
  console.log('   Run: npm run dev');
  process.exit(0);
}
