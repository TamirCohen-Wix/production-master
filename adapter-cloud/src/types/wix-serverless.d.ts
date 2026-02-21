/**
 * Ambient type declarations for Wix Serverless packages.
 * These packages are only available from the Wix npm registry
 * (npm.dev.wixpress.com). Declarations allow typecheck to pass
 * in CI environments without access to the Wix registry.
 */

declare module '@wix/serverless-api' {
  export class FunctionsBuilder {
    withAppDefId(appDefId: string): this;
    withAppSecret(config: { configKey: string }): this;
    addHttpService(app: unknown): this;
  }
}

declare module '@wix/serverless-runtime' {
  export interface FunctionContext {
    getConfig(): Record<string, string>;
  }
}

declare module '@wix/wix-aspects' {
  export interface WixAspects {
    requestId: string;
  }
}

declare module '@wix/panorama-client-node' {
  export function getLogger(name: string): {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
  };
}
