import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, closeDB } from '../src/config/database.ts';
import notificationDispatchService from '../src/services/notificationDispatch.service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const jobName = process.argv[2];

const main = async (): Promise<void> => {
  if (!jobName) {
    console.error('Usage: npm run test:notification-crons -- <job-name>');
    console.error('Jobs:', notificationDispatchService.listNotificationJobs().join(', '));
    process.exit(1);
  }

  await connectDB();
  const result = await notificationDispatchService.runNotificationJob(jobName);
  console.log(JSON.stringify({ job: jobName, ...result }, null, 2));
  await closeDB();
};

main().catch(async (error) => {
  console.error(error);
  await closeDB();
  process.exit(1);
});
