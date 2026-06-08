import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  InvestorTimelineSection,
  InvestorWhyInvestSection,
} from '../../src/components/investorForums/InvestorRoomPanels.jsx';
import { applyInvestorRoomDefaults } from '../../src/services/investorForums/investorRoomDefaults.js';

test('applyInvestorRoomDefaults normalise why_invest string corrompu', () => {
  const normalized = applyInvestorRoomDefaults({ why_invest: 'texte invalide' });
  assert.ok(Array.isArray(normalized.why_invest));
  assert.ok(normalized.why_invest.length > 0);
});

test('InvestorWhyInvestSection rend en mode édition avec why_invest corrompu', () => {
  const html = renderToString(React.createElement(InvestorWhyInvestSection, {
    profile: { investorRoom: { whyInvest: [] } },
    editing: true,
    manualDraft: { why_invest: 'pas un tableau' },
    onPatch: () => {},
  }));
  assert.ok(html.includes('Pourquoi investir'));
});

test('InvestorTimelineSection rend avec timeline sans items', () => {
  const html = renderToString(React.createElement(InvestorTimelineSection, {
    profile: { investorRoom: { timeline: [{ year: '2026' }] } },
    editing: false,
    manualDraft: {},
    onPatch: () => {},
  }));
  assert.ok(html.includes('Roadmap'));
});
