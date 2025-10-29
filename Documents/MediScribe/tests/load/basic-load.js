import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp-up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '3m', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // 95% of requests must complete below 5s
    'http_req_failed': ['rate<0.01'],     // Less than 1% error rate
    'errors': ['rate<0.05'],              // Less than 5% errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const responses = [
    http.get(`${BASE_URL}/api/health`),
    http.get(`${BASE_URL}/`),
  ];

  responses.forEach(response => {
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!success);
    apiDuration.add(response.timings.duration);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;
  
  let output = '\n';
  output += `${indent}     ✓ checks.........................: ${data.metrics.checks.values.passes} / ${data.metrics.checks.values.fails + data.metrics.checks.values.passes}\n`;
  output += `${indent}     ✓ http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}     ✓ http_reqs......................: ${data.metrics.http_reqs.values.count}\n`;
  
  return output;
}
