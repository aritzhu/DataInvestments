import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import prisma from '../infrastructure/prisma/client';
import { buildLogoUrl } from '../services/companyMeta';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const LOGOS_DIR = path.join(UPLOADS_DIR, 'logos');

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DataInvestments/1.0)' },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const buf = Buffer.from(res.data);
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

async function processLogo(buf: Buffer): Promise<Buffer | null> {
  try {
    const meta = await sharp(buf, { failOn: 'error' }).metadata();
    if (!meta.width || !meta.height) return null;

    const raw = await sharp(buf, { failOn: 'error' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cornerA = raw.data[3];
    const transparentCorner = cornerA < 40;
    const background = transparentCorner ? 'rgba(0,0,0,0)' : `rgb(${raw.data[0]},${raw.data[1]},${raw.data[2]})`;

    const trimmed = await sharp(buf, { failOn: 'error' })
      .ensureAlpha()
      .trim({ threshold: 10 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tw = trimmed.info.width;
    const th = trimmed.info.height;
    const channels = trimmed.info.channels;
    const origArea = meta.width * meta.height;
    const trimmedArea = tw * th;
    if (tw < 8 || th < 8 || trimmedArea > origArea * 0.95) return null;

    const margin = Math.min(24, Math.max(6, Math.round(Math.min(tw, th) * 0.1)));
    const out = await sharp(trimmed.data, { raw: { width: tw, height: th, channels } })
      .extend({ top: margin, bottom: margin, left: margin, right: margin, background })
      .png()
      .toBuffer();

    const outMeta = await sharp(out).metadata();
    if (!outMeta.width || !outMeta.height || outMeta.width < 20 || outMeta.height < 20) return null;
    return out;
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const companies = await prisma.company.findMany({
    select: { id: true, ticker: true, website: true, logoUrl: true },
  });

  console.log(`Found ${companies.length} companies`);

  let processed = 0;
  let skipped = 0;
  let kept = 0;
  let failed = 0;

  for (const c of companies) {
    if (c.logoUrl && c.logoUrl.startsWith('/uploads/')) {
      skipped++;
      continue;
    }

    const sourceUrl = c.logoUrl || buildLogoUrl(c.website);
    if (!sourceUrl) {
      failed++;
      console.log(`  ${c.ticker} — sin URL de logo, se conserva el actual`);
      continue;
    }

    const buf = await fetchImage(sourceUrl);
    if (!buf) {
      failed++;
      console.log(`  ${c.ticker} — fetch falló (${sourceUrl}), se conserva el actual`);
      continue;
    }

    const out = await processLogo(buf);
    if (!out) {
      kept++;
      console.log(`  ${c.ticker} — recorte degenerado o error, se conserva el actual`);
      continue;
    }

    const filename = `${c.ticker.replace(/[^A-Za-z0-9._-]/g, '_')}.png`;
    fs.writeFileSync(path.join(LOGOS_DIR, filename), out);
    const localUrl = `/uploads/logos/${filename}`;
    if (c.logoUrl !== localUrl) {
      await prisma.company.update({ where: { id: c.id }, data: { logoUrl: localUrl } });
    }
    processed++;
    console.log(`  ${c.ticker} → ${localUrl}`);
  }

  console.log(`\nDone. Procesados: ${processed}, ya locales: ${skipped}, conservados: ${kept}, fallidos: ${failed}/${companies.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
