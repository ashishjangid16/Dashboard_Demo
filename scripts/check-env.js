require('dotenv').config();

const requiredKeys = [
  'PORT',
  'GITHUB_WEBHOOK_SECRET',
  'NGROK_AUTHTOKEN',
  'DATABASE_URL',
  'DB_SSL',
];

let hasMissingValue = false;

for (const key of requiredKeys) {
  const value = process.env[key] || '';
  const isSet = value.trim().length > 0;

  if (!isSet) {
    hasMissingValue = true;
  }

  console.log(`${key}: ${isSet ? `set length=${value.length}` : 'missing'}`);
}

if (hasMissingValue) {
  process.exit(1);
}
