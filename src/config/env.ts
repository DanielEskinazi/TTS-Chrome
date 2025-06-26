interface Config {
  isDevelopment: boolean;
  isProduction: boolean;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  wsReloadPort: number;
}

export const config: Config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  debug: process.env.DEBUG === 'true',
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  wsReloadPort: parseInt(process.env.WS_RELOAD_PORT || '9090', 10),
};
