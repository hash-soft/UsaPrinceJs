export const enum ELogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

export class GameLog {
  static debug: (message?: unknown, ...optionalParams: unknown[]) => void =
    () => {};
  static log: (message?: unknown, ...optionalParams: unknown[]) => void =
    () => {};
  static warn: (message?: unknown, ...optionalParams: unknown[]) => void =
    () => {};
  static error: (message?: unknown, ...optionalParams: unknown[]) => void =
    console.error.bind(console);
  static initialize(logLevel: number) {
    this.debug =
      ELogLevel.Debug >= logLevel ? console.debug.bind(console) : () => {};
    this.log =
      ELogLevel.Info >= logLevel ? console.log.bind(console) : () => {};
    this.warn =
      ELogLevel.Warn >= logLevel ? console.warn.bind(console) : () => {};
    this.error =
      ELogLevel.Error >= logLevel ? console.error.bind(console) : () => {};
  }
}
