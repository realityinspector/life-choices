
import fs from 'fs';
import path from 'path';

class ActivityLogger {
  private logPath: string;

  constructor() {
    this.logPath = path.join(process.cwd(), 'logs', 'activity-creation.log');
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(activityId: number, activityName: string, userId: number, source: string) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      activityId,
      activityName,
      userId,
      source,
      stack: new Error().stack
    };

    fs.appendFileSync(
      this.logPath,
      JSON.stringify(logEntry) + '\n',
      'utf8'
    );
  }
}

export const activityLogger = new ActivityLogger();
