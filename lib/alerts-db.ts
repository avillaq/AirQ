import { randomUUID } from 'crypto';

export function createUnsubscribeToken(): string {
  return randomUUID();
}
