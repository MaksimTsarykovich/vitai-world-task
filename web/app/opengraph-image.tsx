import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/*
 * OG-превью 1200×630 в палитре макета. Шрифт Literata (кириллица) лежит в
 * public/fonts и читается с диска — никаких внешних запросов на рантайме.
 */
export const runtime = 'nodejs';

export const alt = 'Кварта — кофе, который обжарили в четверг. Минск, партии по 5 кг, с 2019';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPER = '#F2EBDD';
const INK = '#221A15';
const STAMP = '#B4452F';

export default async function OpengraphImage() {
  const literata = await readFile(join(process.cwd(), 'public/fonts/literata-700.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: PAPER,
          padding: '76px 84px',
          fontFamily: 'Literata',
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 72, height: 10, backgroundColor: STAMP }} />
          <div style={{ fontSize: 26, letterSpacing: 8 }}>ОБЖАРКА КОФЕ · МИНСК</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 150, lineHeight: 1, letterSpacing: 14 }}>КВАРТА</div>
          <div style={{ display: 'flex', marginTop: 30, fontSize: 58, lineHeight: 1.12 }}>
            Кофе, который обжарили в четверг
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 34, color: STAMP }}>Минск · партии по 5 кг · с 2019</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Literata', data: literata, weight: 700, style: 'normal' }],
    },
  );
}
