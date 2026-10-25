const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

let counter = 0;

async function createUser({ role = 'employee', password = 'Passw0rd1', verified = true } = {}) {
  counter += 1;
  const user = new User({
    employeeId: `T${String(counter).padStart(3, '0')}`,
    email: `t${counter}@test.local`,
    role,
  });
  await user.setPassword(password);
  user.isEmailVerified = verified;
  await user.save();
  return { user, password };
}

async function loginAs(spec = {}) {
  const { user, password } = await createUser(spec);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });
  if (!res.body.accessToken) {
    throw new Error(`Test login failed: ${JSON.stringify(res.body)}`);
  }
  return { user, token: res.body.accessToken };
}

module.exports = { app, request, createUser, loginAs };
