const baseUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

function requireConfig() {
  if (!baseUrl || !token) {
    const err = new Error('PUSH_REGISTRY_NOT_CONFIGURED');
    err.code = 'PUSH_REGISTRY_NOT_CONFIGURED';
    throw err;
  }
}

export async function redis(command) {
  requireConfig();
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) {
    throw new Error(`REDIS_HTTP_${response.status}`);
  }
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

export const keys = Object.freeze({
  rodrigoSubscription: 'pmx:quiniela:push:operator:rodrigo',
  ibraSubscription: 'pmx:quiniela:push:operator:ibra',
  subscriptionFor(role) { return role === 'IBRA' ? this.ibraSubscription : role === 'RODRIGO' ? this.rodrigoSubscription : null; },
  sentFor(role,eventKey) { return `pmx:quiniela:push:sent:${role}:${eventKey}`; },
  sent: eventKey => `pmx:quiniela:push:sent:${eventKey}`
});
