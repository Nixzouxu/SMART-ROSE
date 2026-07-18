import autocannon from 'autocannon';
import jwt from 'jsonwebtoken';

async function run() {
  console.log('Generating token...');
  // The JWT_ACCESS_SECRET from .env.test is: a58909fb6adfda0279a08c9bb5f03183531b99b9b07e1b67c4ff6960dbb5bc16
  const secret = process.env.JWT_ACCESS_SECRET || 'a58909fb6adfda0279a08c9bb5f03183531b99b9b07e1b67c4ff6960dbb5bc16';
  
  const token = jwt.sign(
    { 
      id: 'c4e14983-5c19-4e1f-b668-5b9a184aa2cc', 
      email: 'admin@smartrose.local',
      role: 'ADMIN_UTAMA',
      unitKerja: 'IT'
    }, 
    secret, 
    { expiresIn: '1h' }
  );

  console.log('Token acquired. Starting load test...');

  const instance = autocannon({
    url: 'http://localhost:4000/api/admin/dashboard/summary',
    connections: 10,
    pipelining: 1,
    duration: 5,
    headers: {
      'Authorization': `Bearer ${token}`
    }
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
