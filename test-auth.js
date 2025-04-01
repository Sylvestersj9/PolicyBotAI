// Test script for authentication functions
import crypto from 'crypto';
import util from 'util';

const scryptAsync = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

async function test() {
  try {
    console.log('Testing password hashing and verification...');
    
    const password = 'TestPassword123';
    console.log(`Original password: ${password}`);
    
    const hashedPassword = await hashPassword(password);
    console.log(`Hashed password: ${hashedPassword}`);
    
    const correctMatch = await comparePasswords(password, hashedPassword);
    console.log(`Correct password match: ${correctMatch}`);
    
    const wrongMatch = await comparePasswords('WrongPassword', hashedPassword);
    console.log(`Wrong password match: ${wrongMatch}`);
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
test();