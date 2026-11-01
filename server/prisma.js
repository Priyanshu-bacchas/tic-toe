const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Configure server/.env.');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
module.exports = new PrismaClient({ adapter });