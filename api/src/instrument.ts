import * as Sentry from '@sentry/node';

// Must be imported before any other module so Sentry can instrument Express and HTTP.
// Sentry stays disabled unless SENTRY_DSN is set, so local dev and tests are unaffected.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    // Report every failure so event-frequency alerts reflect real error volume.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Dedupe'),
  });
  console.log('Sentry error monitoring enabled');
}
