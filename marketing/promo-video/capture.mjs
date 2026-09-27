import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
const [mode, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--font-render-hinting=none','--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.resolve('film.html') + '?capture');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
if (mode === 'stills') {
  for (const t of rest) {
    await page.evaluate((t) => window.render(t), +t);
    await page.screenshot({ path: `stills/t${t}.png` });
  }
} else {
  const fps = 30, dur = await page.evaluate(() => window.DURATION);
  const ff = spawn(process.env.FFMPEG, ['-y','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','video.mp4'], { stdio: ['pipe','inherit','inherit'] });
  const N = Math.round(dur * fps);
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => window.render(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.error('frame', i, '/', N);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
