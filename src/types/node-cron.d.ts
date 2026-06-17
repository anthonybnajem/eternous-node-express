declare module 'node-cron' {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function validate(expression: string): boolean;
  export function schedule(
    expression: string,
    func: () => void | Promise<void>,
    options?: { scheduled?: boolean; timezone?: string }
  ): ScheduledTask;

  const cron: {
    validate: typeof validate;
    schedule: typeof schedule;
  };

  export default cron;
}
