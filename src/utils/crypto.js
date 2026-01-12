import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  // bcrypt handles salt generation internally
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}