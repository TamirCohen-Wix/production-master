/**
 * Panorama Winston transport — forwards structured logs to
 * Wix Panorama when LOG_TO_PANORAMA is enabled.
 */

import Transport from 'winston-transport';

interface PanoramaTransportOptions extends Transport.TransportStreamOptions {
  serviceName?: string;
}

/**
 * Winston transport that forwards logs to Wix Panorama.
 * Only active when LOG_TO_PANORAMA=true.
 */
export class PanoramaTransport extends Transport {
  private readonly serviceName: string;

  constructor(opts: PanoramaTransportOptions = {}) {
    super(opts);
    this.serviceName = opts.serviceName ?? 'production-master';
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const level = info.level as string;
    const message = info.message as string;
    const meta = { ...info };
    delete meta.level;
    delete meta.message;

    // Panorama client is lazily imported to avoid issues when
    // the package is not available (local dev without Wix deps).
    import('@wix/panorama-client-node')
      .then((panorama) => {
        const logger = panorama.getLogger(this.serviceName);

        switch (level) {
          case 'error':
            logger.error(message, meta);
            break;
          case 'warn':
            logger.warn(message, meta);
            break;
          case 'debug':
            logger.debug(message, meta);
            break;
          default:
            logger.info(message, meta);
        }
      })
      .catch(() => {
        // Silently ignore — Panorama is best-effort
      });

    callback();
  }
}
