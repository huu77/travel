import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import fg from 'fast-glob';
import { EmailAddressResolver, EmailAddressTypeDefinition } from 'graphql-scalars';
import { dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ResolverMap = Record<string, unknown>;

type HandlerModule = {
  typeDefs?: string;
  resolvers?: ResolverMap;
};

const baseTypeDefs = `#graphql
  ${EmailAddressTypeDefinition}

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

const baseResolvers = {
  EmailAddress: EmailAddressResolver,
};

async function loadHandlers() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const handlerExtension = extname(currentFile) === '.ts' ? 'ts' : 'js';
  const handlerFiles = await fg(`handlers/**/*.${handlerExtension}`, {
    absolute: true,
    cwd: currentDir,
  });

  const handlers = await Promise.all(
    handlerFiles.map(async (file) => {
      const moduleUrl = pathToFileURL(file).href;
      return import(moduleUrl) as Promise<HandlerModule>;
    }),
  );

  const validTypeDefs = handlers
    .map((handler) => handler.typeDefs)
    .filter((td): td is string => Boolean(td));

  const validResolvers = handlers
    .map((handler) => handler.resolvers)
    .filter((r): r is ResolverMap => Boolean(r));

  return {
    typeDefs: mergeTypeDefs([baseTypeDefs, ...validTypeDefs]),
    resolvers: mergeResolvers([baseResolvers, ...validResolvers] as Parameters<
      typeof mergeResolvers
    >[0]),
    loadedHandlers: handlerFiles.map((file) => file.replace(`${currentDir}/`, '')),
  };
}

const { typeDefs, resolvers, loadedHandlers } = await loadHandlers();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const port = Number(process.env.PORT) || 4000;
const { url } = await startStandaloneServer(server, {
  listen: { port },
});

async function reloadHasuraRemoteSchema() {
  const hasuraMetadataUrl = process.env.HASURA_METADATA_URL || 'http://localhost:8080/v1/metadata';
  const adminSecret = process.env.HASURA_ADMIN_SECRET || 'hasura-secret';
  const remoteSchemaName = process.env.HASURA_REMOTE_SCHEMA_NAME || 'travel_server';
  const graphqlServerUrl =
    process.env.HASURA_GRAPHQL_REMOTE_URL || 'http://host.docker.internal:4000/';

  try {
    const response = await fetch(hasuraMetadataUrl, {
      method: 'POST',
      headers: {
        'x-hasura-admin-secret': adminSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reload_remote_schema',
        args: {
          name: remoteSchemaName,
        },
      }),
    });

    const result = (await response.json()) as Record<string, unknown>;

    const isNotExistsError = result.code === 'not-exists';
    if (isNotExistsError) {
      console.log(
        `[Hasura] Chưa thấy Remote Schema "${remoteSchemaName}", đang tự động đăng ký mới...`,
      );
      const addResponse = await fetch(hasuraMetadataUrl, {
        method: 'POST',
        headers: {
          'x-hasura-admin-secret': adminSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add_remote_schema',
          args: {
            name: remoteSchemaName,
            definition: {
              url: graphqlServerUrl,
              timeout_seconds: 60,
            },
          },
        }),
      });

      const addResult = (await addResponse.json()) as Record<string, unknown>;
      const isAddExistsError = !addResponse.ok || Boolean(addResult.error);
      if (isAddExistsError) {
        console.error('\n❌ [Hasura Add Remote Schema Failed]');
        console.error('- Details:', JSON.stringify(addResult, null, 2));
        return;
      }

      console.log(
        `\n🎉 [Hasura Auto-Registered] Đã tự động thêm Remote Schema "${remoteSchemaName}" vào Hasura!\n`,
      );
      return;
    }

    if (!response.ok || Boolean(result.error) || Boolean(result.code)) {
      console.error('\n❌ [Hasura Reload Failed]');
      console.error('- Details:', JSON.stringify(result, null, 2));
    } else {
      console.log(
        `\n🔄 [Hasura Synced] Đã tự động reload Remote Schema "${remoteSchemaName}" thành công!\n`,
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n⚠️ [Hasura Connection Error]');
    console.error(`- Không thể kết nối tới Hasura tại: ${hasuraMetadataUrl}`);
    console.error(`- Lỗi: ${message}\n`);
  }
}

await reloadHasuraRemoteSchema();

console.log(`Server ready at ${url}`);
console.log(`Loaded handlers: ${loadedHandlers.join(', ') || 'none'}`);
