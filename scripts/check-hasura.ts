import { env } from '../src/shared/env.js';

async function checkHasura() {
  console.log('🔍 Đang kiểm tra trạng thái Hasura tại:', env.HASURA_METADATA_URL);

  const res = await fetch(env.HASURA_METADATA_URL, {
    method: 'POST',
    headers: {
      'x-hasura-admin-secret': env.HASURA_ADMIN_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'export_metadata',
      args: {},
    }),
  });

  const metadata = await res.json();
  const sources = metadata.sources || [];
  console.log('\n📦 Các Database Sources đã kết nối trong Hasura:');
  for (const s of sources) {
    console.log(`\n- Source Name: "${s.name}" (Kind: ${s.kind})`);
    console.log(
      `  Connection URL: ${JSON.stringify(s.configuration?.connection_info?.database_url || 'Hidden/Env var')}`,
    );
    console.log(`  Danh sách Bảng đã Track (${s.tables?.length || 0} bảng trong public):`);
    for (const t of s.tables || []) {
      const name = typeof t.table === 'string' ? t.table : `${t.table.schema}.${t.table.name}`;
      console.log(
        `   * ${name} (${t.object_relationships?.length || 0} object rels, ${t.array_relationships?.length || 0} array rels)`,
      );
    }
  }

  const remoteSchemas = metadata.remote_schemas || [];
  console.log('\n🌐 Remote Schemas đã đăng ký:');
  if (remoteSchemas.length === 0) {
    console.log('  (Chưa có Remote Schema nào được đăng ký)');
  } else {
    for (const rs of remoteSchemas) {
      console.log(`- Name: "${rs.name}" | URL: ${rs.definition?.url}`);
    }
  }
}

checkHasura();
