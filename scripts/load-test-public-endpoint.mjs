import autocannon from 'autocannon';

async function run() {
  console.log('Starting load test on public endpoint GET /api/captcha...');

  const instance = autocannon({
    url: 'http://localhost:4000/api/captcha',
    connections: 10,
    pipelining: 1,
    duration: 5, // 5 seconds
  }, (err, result) => {
     if (err) {
       console.error(err);
     } else {
       console.log(result);
     }
  });

  autocannon.track(instance, { renderProgressBar: false });
}

run();
