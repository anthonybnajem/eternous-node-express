import winston from 'winston';

// We need to handle config import carefully due to circular dependency
const getEnv = () => process.env.NODE_ENV || 'development';

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const logger = winston.createLogger({
  level: getEnv() === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    getEnv() === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true, // Always write to the same file, rotate old files
      zippedArchive: true, // Compress old log files to save space
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true, // Always write to the same file, rotate old files
      zippedArchive: true, // Compress old log files to save space
    }),
  ],
  exitOnError: false,
});

const stream = {
  write(message: string): void {
    logger.info(message.trim());
  },
};

export { stream };
export default logger;
