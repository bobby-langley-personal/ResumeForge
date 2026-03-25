/** @type {import('next').NextConfig} */
import { readFileSync } from 'fs';

// Version format: {Major}.{YY}{M}.{DD}{H}
// e.g. 1.263.259 = major 1, year 26, month 3, day 25, hour 9
// Date portion is computed at build time — every deploy auto-updates it.
// To bump the major version, update the "version" field in package.json.
const major = readFileSync('./package.json', 'utf8').match(/"version":\s*"(\d+)/)?.[1] ?? '1';
const now = new Date();
const yy = String(now.getFullYear()).slice(-2);
const m  = String(now.getMonth() + 1);          // no leading zero
const dd = String(now.getDate()).padStart(2, '0');
const h  = String(now.getHours());               // no leading zero

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: `${major}.${yy}${m}.${dd}${h}`,
  },
};

export default nextConfig;
