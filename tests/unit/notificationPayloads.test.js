import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPayloadFromAlert } from '../../src/services/notificationPayloads.js';

test('buildNotificationPayloadFromAlert: emoji + tag + deep-link', () => {
  const payload = buildNotificationPayloadFromAlert({
    id: 'ALERT-1',
    title: 'Stock critique',
    message: 'Aliment chair : 2 sacs restants',
    action_recommandee: 'Commander ou réceptionner stock',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: 'STK-1',
    severity: 'critique',
    alert_dedupe_key: 'ISSUE-KEY-123',
    status: 'nouvelle',
  });

  assert.equal(payload.alert_id, 'ALERT-1');
  assert.equal(payload.entity_id, 'STK-1');
  assert.ok(payload.title.startsWith('⚠️'), 'critique doit utiliser l’emoji ⚠️');
  assert.ok(payload.body.includes('Action : Commander ou réceptionner stock'));
  assert.equal(payload.tag, 'ISSUE-KEY-123');
  assert.equal(payload.url, '/?module=alertes&alert_id=ALERT-1');
});

