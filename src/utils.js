import fs from "fs";

export function getPath(path) {
  return path.startsWith("/") ? path : "/" + path;
}

export function getReqUrl(req, path) {
  if (req.get("host") === "localhost:7000") {
    return `http://${req.get("x-forwarded-host") || req.get("host")}${getPath(
      path || req.originalUrl
    )}`;
  } else {
    return `https://${req.get("x-forwarded-host") || req.get("host")}${getPath(
      path || req.originalUrl
    )}`;
  }
}

export function removeHeaders(cert) {
  const pem = /-----BEGIN (\w*)-----([^-]*)-----END (\w*)-----/g.exec(cert);
  if (pem && pem.length > 0) {
    return pem[2].replace(/[\n|\r\n]/g, "");
  }
  return cert;
}

export function logRelayState(req, logger, step) {
  const relayStateBody = req.body.RelayState;
  const relayStateQuery = req.query.RelayState;
  logger.info(
    `Relay state ${step} - body: ${relayStateBody} query: ${relayStateQuery}`,
    {
      time: new Date().toISOString(),
      relayStateBody,
      relayStateQuery,
      step: step,
      session: req.sessionID,
    }
  );
}

/*
 * Cache of previously rendered CSS files.
 */
let renderedCss = {};

/**
 * Middleware to lazily-render CSS from SCSS.
 *
 * Modeled after node-sass-middleware.
 *
 * @param {{
 *     src: string,
 *     dest: string,
 *     importer: Function,
 *     outputStyle: String,
 *     sass: Function, log: Function
 *   }} options
 * @returns {Function}
 */
export function sassMiddleware(options) {
  const src = options.src;
  const dest = options.dest;
  const importer = options.importer;
  const outputStyle = options.outputStyle;
  const sass = options.sass;
  const log = options.log || function () {};

  return function middleware(req, res, next) {
    if (!/\.css$/.test(req.path)) {
      log("skipping non-css path");
      return next();
    }

    if (renderedCss[src]) {
      log("css already rendered");
      return next();
    }

    try {
      log("rendering css");
      const result = sass.renderSync({
        file: src,
        importer: importer,
        outputStyle: outputStyle,
      });

      log("writing to file");
      fs.writeFileSync(dest, result.css, "utf8");

      log("caching src");
      renderedCss[src] = result.stats.includedFiles;
    } catch (err) {
      next(err);
    }

    return next();
  };
}
