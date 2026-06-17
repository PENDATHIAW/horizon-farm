/**
 * Génère public/pitch-horizon-farm.html depuis scripts/pitch-slides-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SLIDES } from './pitch-slides-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'public', 'pitch-horizon-farm.html');
const STYLE_SOURCE = path.join(ROOT, 'public', 'pitch-horizon-farm.html');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}

function topBar(index, total, dark = false) {
  const logoFilter = dark ? ' style="filter:brightness(1.1);"' : '';
  return `
      <div class="top-bar">
        <div class="logo-wrap"><img src="/horizon-farm-logo-transparent.png" alt=""${logoFilter} /></div>
        <span class="slide-num">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
      </div>`;
}

function renderBullets(bullets, numbered = false) {
  if (!bullets?.length) return '';
  if (numbered) {
    return `<ul class="pain-list">${bullets.map((b, i) => {
      const m = b.match(/^(.+?) — (.+)$/);
      const title = m ? m[1] : b;
      const rest = m ? m[2] : '';
      return `<li><span class="num">${i + 1}</span><div><strong>${esc(title)}</strong>${rest ? ` — ${esc(rest)}` : ''}</div></li>`;
    }).join('')}</ul>`;
  }
  return `<ul class="pain-list">${bullets.map((b) => {
    const m = b.match(/^(.+?) — (.+)$/);
    if (m) return `<li><span class="num">•</span><div><strong>${esc(m[1])}</strong> — ${esc(m[2])}</div></li>`;
    return `<li><span class="num">•</span><div>${esc(b)}</div></li>`;
  }).join('')}</ul>`;
}

function renderSlide(data, index, total) {
  const dark = data.dark ? ' slide--dark' : '';
  const active = index === 0 ? ' active' : '';

  if (data.layout === 'cover') {
    return `
    <section class="slide${dark}${active}">
      <div class="content cover-center" style="display:flex;flex-direction:column;">
        <img src="/horizon-farm-logo-transparent.png" alt="Horizon Farm" class="logo-hero" />
        <p class="kicker">${esc(data.kicker)}</p>
        <h1>${esc(data.title)}</h1>
        <p class="lead" style="color:#a7d4b5;">${esc(data.body)}</p>
        <p class="tagline">${esc(data.footer)}</p>
      </div>
    </section>`;
  }

  if (data.layout === 'cta') {
    return `
    <section class="slide${active}">
      ${topBar(index, total)}
      <div class="content cta-box">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2 style="max-width:none;">${esc(data.title)}</h2>
        <p class="lead" style="margin:1rem auto 0;">${esc(data.body)}</p>
        <a class="btn" href="/demo-horizon-farm.html">${esc(data.cta)}</a>
        <p class="tagline" style="margin-top:2rem;">${esc(data.footer)}</p>
        <p style="margin-top:0.5rem;font-size:0.85rem;color:var(--hf-muted);">${esc(data.email)}</p>
      </div>
    </section>`;
  }

  let inner = '';

  if (data.twoCol) {
    const cards = data.twoCol.map((row) => `
            <div class="card card--domain">
              <p class="card__label">${esc(row[0])}</p>
              <p class="card__value">${esc(row[1])}</p>
              <p class="card__line">${esc(row[2])}</p>
            </div>`).join('');
    const highlight = data.highlight
      ? `<div class="sensor-strip" style="margin-top:0.85rem;"><strong>${esc(data.highlight.split(':')[0] || 'INFO')}</strong><p class="card__line">${esc(data.highlight)}</p></div>`
      : '';
    inner = `
      <div class="content grid-2">
        <div>
          <p class="kicker">${esc(data.kicker)}</p>
          <h2>${esc(data.title)}</h2>
          ${data.body ? `<p class="lead">${esc(data.body)}</p>` : ''}
        </div>
        <div>
          <div class="grid-2" style="gap:0.65rem;">${cards}</div>
          ${highlight}
        </div>
      </div>`;
  } else if (data.chat) {
    const bubbles = data.chat.map((msg) => {
      const cls = msg.role === 'user' ? 'bubble--user' : 'bubble--bot';
      const text = msg.role === 'bot' ? `<strong>Brouillon</strong><br/>${esc(msg.text)}` : esc(msg.text);
      return `<div class="bubble ${cls}">${text}</div>`;
    }).join('');
    inner = `
      <div class="content grid-2">
        <div>
          <p class="kicker">${esc(data.kicker)}</p>
          <h2>${esc(data.title)}</h2>
          <p class="lead"${dark ? ' style="color:#a7d4b5;"' : ''}>${esc(data.body || '')}</p>
        </div>
        <div class="chat-mock">${bubbles}</div>
      </div>`;
  } else if (data.metrics) {
    const metrics = data.metrics.map((m, i) => `
            <div style="flex:1;text-align:center;padding:1rem;background:${i === 0 ? '#f0fdf4' : '#fffbeb'};border-radius:0.75rem;">
              <p style="font-size:0.7rem;color:var(--hf-muted);">${esc(m.label)}</p>
              <p style="font-family:Fraunces,serif;font-size:2rem;font-weight:700;color:${i === 0 ? '#15803d' : '#b45309'};">${esc(m.value)}</p>
            </div>`).join('');
    const alert = data.alert
      ? `<p class="card__line" style="padding:0.75rem;background:#fef3c7;border-radius:0.5rem;color:#92400e;font-weight:600;margin-top:1rem;">⚠ ${esc(data.alert)}</p>`
      : '';
    inner = `
      <div class="content grid-2">
        <div>
          <p class="kicker">${esc(data.kicker)}</p>
          <h2>${esc(data.title)}</h2>
          ${renderBullets(data.bullets)}
        </div>
        <div class="card" style="padding:1.5rem;">
          <p class="card__label" style="margin-bottom:1rem;">Flux temps réel</p>
          <div style="display:flex;gap:1rem;margin-bottom:0.5rem;">${metrics}</div>
          ${alert}
        </div>
      </div>`;
  } else if (data.bars) {
    const heights = ['85%', '70%', '55%', '90%', '60%'];
    const bars = data.bars.map((bar, i) => `
          <div class="bar-col">
            <span class="bar-value">${esc(bar.value)}</span>
            <div class="bar${i % 2 ? ' bar--gold' : ''}" style="height:${heights[i % heights.length]};"></div>
            <span class="bar-label">${esc(bar.label)}</span>
          </div>`).join('');
    inner = `
      <div class="content">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2>${esc(data.title)}</h2>
        <div class="chart-bars">${bars}</div>
      </div>`;
  } else if (data.personas) {
    const icons = ['🐓', '🐄', '🌱', '🌾', '🏢', '📈'];
    const personas = data.personas.map((p, i) => `
          <div class="persona">
            <div class="persona__icon">${icons[i] || '✓'}</div>
            <strong>${esc(p[0])}</strong>
            <span>${esc(p[1])}</span>
          </div>`).join('');
    inner = `
      <div class="content">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2>${esc(data.title)}</h2>
        <div class="personas">${personas}</div>
      </div>`;
  } else if (data.phases) {
    const phases = data.phases.map((ph, i) => `
          <div class="phase" data-step="${i + 1}">
            <h3>${esc(ph[0])}</h3>
            <p>${esc(ph[1])}</p>
          </div>`).join('');
    inner = `
      <div class="content">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2>${esc(data.title)}</h2>
        <div class="phases">${phases}</div>
      </div>`;
  } else if (data.timeline) {
    const items = data.timeline.map((item) => `
          <div class="timeline__item">
            <strong>${esc(item[0])}</strong>
            <span>${esc(item[1])}</span>
          </div>`).join('');
    inner = `
      <div class="content">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2>${esc(data.title)}</h2>
        <div class="timeline">${items}</div>
      </div>`;
  } else if (data.quote && !data.bullets?.length) {
    inner = `
      <div class="content" style="text-align:center;align-items:center;">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2 style="max-width:20ch;margin:0 auto;">${esc(data.title)}</h2>
        <p class="quote" style="margin:2rem auto 0;text-align:left;">${esc(data.quote)}</p>
      </div>`;
  } else {
    inner = `
      <div class="content">
        <p class="kicker">${esc(data.kicker)}</p>
        <h2>${esc(data.title)}</h2>
        ${data.body ? `<p class="lead">${esc(data.body)}</p>` : ''}
        ${data.quote ? `<p class="quote">${esc(data.quote)}</p>` : ''}
        ${renderBullets(data.bullets, data.kicker === 'Le constat')}
        ${data.footer ? `<p class="tagline" style="margin-top:1.5rem;text-align:center;">${esc(data.footer)}</p>` : ''}
        ${data.note ? `<p class="speaker-note" style="position:relative;bottom:auto;right:auto;margin-top:1rem;">→ ${esc(data.note)}</p>` : ''}
      </div>`;
  }

  const needsTopBar = data.layout !== 'cover' && data.layout !== 'cta';
  return `
    <section class="slide${dark}${active}">
      ${needsTopBar ? topBar(index, total, data.dark) : ''}
      ${inner}
    </section>`;
}

function extractStyles() {
  const src = fs.readFileSync(STYLE_SOURCE, 'utf8');
  const m = src.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

const NAV_SCRIPT = `
  <script>
    const slides = [...document.querySelectorAll('.slide')];
    const progress = document.getElementById('progress');
    let current = 0;

    function go(n) {
      slides[current].classList.remove('active');
      current = Math.max(0, Math.min(slides.length - 1, n));
      slides[current].classList.add('active');
      progress.style.width = ((current + 1) / slides.length * 100) + '%';
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(current - 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
      if (e.key === 'p' || e.key === 'P') window.print();
    });

    document.getElementById('deck').addEventListener('click', (e) => {
      if (e.target.closest('a, button, input')) return;
      const x = e.clientX / window.innerWidth;
      go(x > 0.65 ? current + 1 : x < 0.35 ? current - 1 : current);
    });

    go(0);
  </script>`;

export function generatePitchHtml() {
  const styles = extractStyles();
  const total = SLIDES.length;
  const slidesHtml = SLIDES.map((s, i) => renderSlide(s, i, total)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Horizon Farm — Pitch client</title>
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&display=swap" rel="stylesheet" />
  <style>${styles}</style>
</head>
<body>
  <div class="progress" id="progress"></div>
  <div class="deck" id="deck">
${slidesHtml}
  </div>
  <div class="nav-hint">
    <span><kbd>←</kbd> <kbd>→</kbd> ou clic pour naviguer</span>
    <span><kbd>F</kbd> plein écran</span>
    <span><kbd>P</kbd> imprimer / PDF</span>
    <span><a href="/demo-horizon-farm.html" style="color:#86efac;margin-left:0.5rem;">Démo interactive →</a></span>
  </div>
${NAV_SCRIPT}
</body>
</html>
`;

  fs.writeFileSync(HTML_PATH, html);
  console.log('✓ HTML pitch:', HTML_PATH, `(${total} slides)`);
  return HTML_PATH;
}

if (process.argv[1]?.endsWith('generate-pitch-html.mjs')) {
  generatePitchHtml();
}
