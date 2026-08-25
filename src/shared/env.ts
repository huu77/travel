import 'dotenv/config';

export const env = {
  // Server
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/app?schema=public',

  // Hasura Configuration
  HASURA_METADATA_URL: process.env.HASURA_METADATA_URL || 'http://localhost:8080/v1/metadata',
  HASURA_ADMIN_SECRET: process.env.HASURA_ADMIN_SECRET || 'hasura-secret',
  HASURA_REMOTE_SCHEMA_NAME: process.env.HASURA_REMOTE_SCHEMA_NAME || 'travel_server',
  HASURA_GRAPHQL_REMOTE_URL:
    process.env.HASURA_GRAPHQL_REMOTE_URL || 'http://host.docker.internal:4000/',
  HASURA_SOURCE_NAME: process.env.HASURA_SOURCE_NAME || 'travel',

  // Duffel Flights API
  DUFFEL_API_TOKEN: process.env.DUFFEL_API_TOKEN || '',
  DUFFEL_API_URL: process.env.DUFFEL_API_URL || 'https://api.duffel.com',
} as const;

export default env;
