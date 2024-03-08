import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';

export let options = {
    vus: 1, // 1 virtual user
    duration: '2m', // Duration of the test: 2 minutes
};

export default function () {
    let response = http.get('http://spicy.kebab.solutions:31000');
    check(response, {
        'Response time is less than 500ms': (r) => r.timings.duration < 500
    });
    sleep(10); // Wait for 10 seconds before making the next request
}
