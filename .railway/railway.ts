import { defineRailway, github, preserve, project, service } from 'railway/iac';

// Production hosting for the live incident demo. See docs/production-alert-demo.md.
const REPO = 'octodemo/octocat_supply';
const BRANCH = 'main';

export default defineRailway(() => {
  const api = service('api', {
    source: github(REPO, { branch: BRANCH, rootDirectory: 'api' }),
    healthcheck: '/',
    env: {
      NODE_ENV: 'production',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_DSN: preserve(),
    },
  });

  const frontend = service('frontend', {
    source: github(REPO, { branch: BRANCH, rootDirectory: 'frontend' }),
    env: {
      PORT: '80',
      API_HOST: api.env.RAILWAY_PUBLIC_DOMAIN,
      API_PORT: '443',
      API_PROTOCOL: 'https',
    },
  });

  // Steady order traffic every 5 minutes. Set INCIDENT=true to start the incident.
  const traffic = service('traffic', {
    source: github(REPO, { branch: BRANCH, rootDirectory: 'api' }),
    start: 'node dist/simulate-traffic.js',
    deploy: {
      cronSchedule: '*/5 * * * *',
      restartPolicyType: 'NEVER',
    },
    env: {
      TARGET_URL: api.env.RAILWAY_PUBLIC_DOMAIN,
      ORDER_COUNT: '15',
      INCIDENT: 'false',
    },
  });

  return project('octocat-supply', {
    resources: [api, frontend, traffic],
  });
});
