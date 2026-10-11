import { getStore } from '@netlify/blobs';

export function contentStore() {
  return getStore('bac-si-content');
}

export async function listRecords(store, prefix) {
  const records = [];

  for await (const page of store.list({ prefix, paginate: true })) {
    records.push(...page.blobs);
  }

  return records;
}

export async function getJson(store, key) {
  return store.get(key, { type: 'json' });
}
