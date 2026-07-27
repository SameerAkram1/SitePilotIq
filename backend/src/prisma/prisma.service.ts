import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      this.logger.log(`Database connected (attempt ${attempt})`);
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        this.logger.error(
          `Failed to connect after ${MAX_RETRIES} attempts. Exiting.`,
        );
        throw error;
      }
      this.logger.warn(
        `Connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}. Retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      return this.connectWithRetry(attempt + 1);
    }
  }

  async withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isPoolError =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2037';
        const isConnectionError =
          error instanceof Error &&
          (error.message.includes('EMAXCONNSESSION') ||
           error.message.includes('too many clients') ||
           error.message.includes('connection pool'));

        if ((isPoolError || isConnectionError) && attempt < retries) {
          const delay = 300 * Math.pow(2, attempt);
          this.logger.warn(
            `Pool exhausted, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unreachable');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
