/**
 * Simulates branch order traffic against a running API.
 *
 * Normal mode places orders from the established branches. Incident mode also
 * places orders from the newest branch.
 *
 * Usage:
 *   node dist/simulate-traffic.js [--incident] [--orders 20] [--url https://api.example.com]
 *
 * Environment overrides: TARGET_URL, ORDER_COUNT, INCIDENT=true, INCIDENT_RATE, DELAY_MS
 */

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const rawTarget = argValue('url') || process.env.TARGET_URL || 'http://localhost:3000';
// Railway service references resolve to a bare domain, so default to https.
const targetUrl = (/^https?:\/\//.test(rawTarget) ? rawTarget : `https://${rawTarget}`).replace(/\/$/, '');
const orderCount = parseInt(argValue('orders') || process.env.ORDER_COUNT || '20', 10);
const incident = args.includes('--incident') || process.env.INCIDENT === 'true';
const incidentRate = parseFloat(argValue('incident-rate') || process.env.INCIDENT_RATE || '0.35');
const delayMs = parseInt(argValue('delay') || process.env.DELAY_MS || '400', 10);

const ESTABLISHED_BRANCH_IDS = [1, 2];
const NEW_BRANCH_ID = 3;

const ORDER_TEMPLATES = [
  { name: 'Weekly restock', description: 'Smart feeders and water fountains' },
  { name: 'Showroom refresh', description: 'Display units for the new collar line' },
  { name: 'Customer backorder', description: 'Reserved litter boxes for pickup' },
  { name: 'Seasonal promotion', description: 'Holiday toy bundles' },
  { name: 'Replacement parts', description: 'Filters and charging docks' },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

async function request(method: string, path: string, body?: unknown): Promise<number> {
  try {
    const response = await fetch(`${targetUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.status;
  } catch (error) {
    console.error(`${method} ${path} failed:`, error instanceof Error ? error.message : error);
    return 0;
  }
}

async function main() {
  console.log(
    `Simulating ${orderCount} orders against ${targetUrl} (${incident ? `incident, rate ${incidentRate}` : 'healthy'})`,
  );
  const statusCounts: Record<string, number> = {};

  for (let i = 0; i < orderCount; i++) {
    await request('GET', '/api/products');

    const fromNewBranch = incident && Math.random() < incidentRate;
    const branchId = fromNewBranch ? NEW_BRANCH_ID : pick(ESTABLISHED_BRANCH_IDS);
    const template = pick(ORDER_TEMPLATES);
    const status = await request('POST', '/api/orders', {
      branchId,
      orderDate: new Date().toISOString(),
      name: template.name,
      description: template.description,
      status: 'pending',
    });

    statusCounts[status] = (statusCounts[status] || 0) + 1;
    console.log(`POST /api/orders branch=${branchId} -> ${status}`);
    await sleep(delayMs);
  }

  console.log('Order status summary:', statusCounts);
}

main();
