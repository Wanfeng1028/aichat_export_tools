import { ExporterError } from '../../core/errors';
import type { SiteAdapter } from './types';

export abstract class BaseAdapter implements SiteAdapter {
  abstract readonly site: SiteAdapter['site'];
  abstract getStatus(): Promise<Awaited<ReturnType<SiteAdapter['getStatus']>>>;
  abstract exportCurrentConversation(): Promise<Awaited<ReturnType<SiteAdapter['exportCurrentConversation']>>>;
  abstract scanConversationList(): Promise<Awaited<ReturnType<SiteAdapter['scanConversationList']>>>;

  protected ensure(condition: unknown, message: string): asserts condition {
    if (!condition) {
      throw new ExporterError(message);
    }
  }
}
