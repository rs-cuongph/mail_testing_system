import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || 'file:./data/mail-testing-system.db';
}

function ensureSqliteDirectory(databaseUrl: string) {
  if (!databaseUrl.startsWith('file:')) {
    return;
  }

  const sqlitePath = databaseUrl.slice('file:'.length);
  const resolvedPath = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), sqlitePath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = resolveDatabaseUrl();
    ensureSqliteDirectory(databaseUrl);
    process.env.DATABASE_URL = databaseUrl;
    const adapter = new PrismaLibSql({ url: databaseUrl });
    super({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`Database connected (${process.env.DATABASE_URL})`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
