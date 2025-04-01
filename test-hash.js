import crypto from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

async function test() {
  try {
    // Generate a hash for "password123"
    const passwordToHash = "password123";
    const hash = await hashPassword(passwordToHash);
    console.log("Generated hash:", hash);
    
    // Verify the hash works
    const match = await comparePasswords(passwordToHash, hash);
    console.log("Password verification result:", match);
    
    // This hash should match our statically defined one
    console.log("\nTesting our predefined hash...");
    const predefinedHash = "5dde749c8e9dfad799851738de21d4959869d34caec869cce2d0428ba4ef0bc085d5ef9e4be6345367c86474d45a4b26d3e57b4239a398b25f541c66c19f4a27.ad11694e1ef12238faefff3d4a4840fd";
    const predefinedMatch = await comparePasswords(passwordToHash, predefinedHash);
    console.log("Predefined hash verification result:", predefinedMatch);
  } catch (error) {
    console.error("Error testing password hashing:", error);
  }
}

test();