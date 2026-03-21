/**
 * Password hash generator for NEON SIGNS local auth
 * Usage: node scripts/hash-password.mjs
 *
 * Prompts for a password and outputs the bcrypt hash to set as ADMIN_PASSWORD_HASH.
 */

import * as readline from 'readline';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Hide input (basic approach)
process.stdout.write('Enter admin password: ');

// Disable echo for password input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

let password = '';

process.stdin.on('data', (char) => {
  char = char.toString();
  
  if (char === '\n' || char === '\r' || char === '\u0004') {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write('\n');
    rl.close();
    
    if (!password) {
      console.error('Error: Password cannot be empty');
      process.exit(1);
    }
    
    bcrypt.hash(password, 12).then((hash) => {
      console.log('\nBcrypt hash (copy this as ADMIN_PASSWORD_HASH):');
      console.log(hash);
      console.log('\nAdd to your .env or Railway environment variables:');
      console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    });
  } else if (char === '\u0003') {
    // Ctrl+C
    process.exit();
  } else if (char === '\u007F') {
    // Backspace
    password = password.slice(0, -1);
  } else {
    password += char;
  }
});
