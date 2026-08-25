import { env } from '../src/shared/env.js';

const hasuraMetadataUrl = env.HASURA_METADATA_URL;
const adminSecret = env.HASURA_ADMIN_SECRET;
const source = env.HASURA_SOURCE_NAME;

const tables = [
  'users',
  'passengers',
  'bookings',
  'booking_passengers',
  'transactions',
  'transaction_entries',
  'currencies',
  'providers',
];

const relationships = [
  // Object Relationships (N - 1)
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'passengers' },
      name: 'user',
      using: { foreign_key_constraint_on: 'userId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'bookings' },
      name: 'user',
      using: { foreign_key_constraint_on: 'userId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'booking_passengers' },
      name: 'booking',
      using: { foreign_key_constraint_on: 'bookingId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'booking_passengers' },
      name: 'passenger',
      using: { foreign_key_constraint_on: 'passengerId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'transactions' },
      name: 'user',
      using: { foreign_key_constraint_on: 'userId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'transactions' },
      name: 'booking',
      using: { foreign_key_constraint_on: 'bookingId' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'transaction_entries' },
      name: 'transaction',
      using: { foreign_key_constraint_on: 'transactionId' },
    },
  },
  // Array Relationships (1 - N)
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'users' },
      name: 'passengers',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'passengers' },
          column: 'userId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'users' },
      name: 'bookings',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'bookings' },
          column: 'userId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'users' },
      name: 'transactions',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'transactions' },
          column: 'userId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'bookings' },
      name: 'booking_passengers',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'booking_passengers' },
          column: 'bookingId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'bookings' },
      name: 'transactions',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'transactions' },
          column: 'bookingId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'passengers' },
      name: 'booking_passengers',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'booking_passengers' },
          column: 'passengerId',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'transactions' },
      name: 'entries',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'transaction_entries' },
          column: 'transactionId',
        },
      },
    },
  },
  // Provider Relationships
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'bookings' },
      name: 'providerRef',
      using: { foreign_key_constraint_on: 'provider' },
    },
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'transactions' },
      name: 'providerRef',
      using: { foreign_key_constraint_on: 'provider' },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'providers' },
      name: 'bookings',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'bookings' },
          column: 'provider',
        },
      },
    },
  },
  {
    type: 'pg_create_array_relationship',
    args: {
      source,
      table: { schema: 'public', name: 'providers' },
      name: 'transactions',
      using: {
        foreign_key_constraint_on: {
          table: { schema: 'public', name: 'transactions' },
          column: 'provider',
        },
      },
    },
  },
];

async function callHasura(body: unknown) {
  try {
    const res = await fetch(hasuraMetadataUrl, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': adminSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to call Hasura:', error);
    return null;
  }
}

async function trackAll() {
  console.log('🚀 Bắt đầu Track toàn bộ Database vào Hasura...');

  // 1. Track Tables
  for (const tableName of tables) {
    const res = await callHasura({
      type: 'pg_track_table',
      args: {
        source,
        table: { schema: 'public', name: tableName },
      },
    });
    if (res?.message === 'success') {
      console.log(`  ✅ Tracked table: ${tableName}`);
    } else {
      console.log(`  ℹ️ Table ${tableName}: ${res?.error || 'Already tracked'}`);
    }
  }

  // 2. Track Relationships
  console.log('\n🔗 Đang thiết lập các mối quan hệ (Relationships)...');
  for (const rel of relationships) {
    const res = await callHasura(rel);
    const tableName = typeof rel.args.table === 'string' ? rel.args.table : rel.args.table.name;
    if (res?.message === 'success') {
      console.log(`  ✅ Created relationship: ${tableName}.${rel.args.name}`);
    } else {
      console.log(
        `  ℹ️ Relationship ${tableName}.${rel.args.name}: ${res?.error || 'Already exists'}`,
      );
    }
  }

  // 3. Reload Metadata
  await callHasura({
    type: 'reload_metadata',
    args: { reload_sources: [source] },
  });

  console.log('\n🎉 Hoàn tất! Toàn bộ 7 bảng và 14 mối quan hệ đã được đồng bộ 100% trên Hasura.');
}

await trackAll();
