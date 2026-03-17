import http from 'http';

const data = JSON.stringify({ url: 'https://www.youtube.com/watch?v=HH6zFZVh9fU' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/generate-notes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
