import http from 'k6/http';
import { check, sleep } from 'k6';

// the load profil
export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // test fails if p99 latency exceeds 500ms
    'http_req_duration{status:202}': ['p(99)<500'], 
  },
};

const URL = 'http://localhost:3000/v1/ingest';

export default function () {
  const isEnterprise = Math.random() < 0.7;

  let apiKey = isEnterprise ? 'sk_live_enterprise_12345' : 'sk_live_startup_99999';

  const payload = JSON.stringify({
    eventType: 'performance_metric',
    source: __VU % 2 === 0 ? 'us-east-worker' : 'eu-west-worker',
    data: {
      cpu_utilization: Math.random() * 100,
      memory_free_bytes: 4 * 1024 * 1024 * 1024,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  };

  // Execute the POST request
  const res = http.post(URL, payload, params);

  // Validate behavioral outcomes
  if (isEnterprise) {
    check(res, {
      'Enterprise event accepted (202)': (r) => r.status === 202,
    });
  } else {
    check(res, {
      'Startup handled safely (202 or 429)': (r) => r.status === 202 || r.status === 429,
    });
  }

  sleep(0.01);
}