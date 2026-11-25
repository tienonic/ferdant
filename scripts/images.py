"""Make the site's photo files from an original: greyscale AVIF, WebP and JPEG at several widths.

Usage: python3 scripts/images.py <original> <name> [--portrait <0-1>]
--portrait also writes a 2:3 phone crop (name-p-*) centred at that fraction of the width.
The tint is applied in CSS, so the files are greyscale. Needs ffmpeg with libaom-av1 and libwebp.
"""
import argparse, subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'assets/img'
ENCODE = {
    'avif': ['-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '34', '-cpu-used', '4', '-pix_fmt', 'yuv420p'],
    'webp': ['-c:v', 'libwebp', '-quality', '70'],
    'jpg': ['-q:v', '5'],
}


def make(src, stem, widths, crop=''):
    for w in widths:
        for fmt, args in ENCODE.items():
            vf = f'{crop}scale={w}:-2:flags=lanczos,hue=s=0'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', vf, '-frames:v', '1', *args, str(OUT / f'{stem}-{w}.{fmt}')], check=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('original', type=Path)
    ap.add_argument('name')
    ap.add_argument('--portrait', type=float)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    make(a.original, a.name, [640, 1024, 1600, 2400])
    if a.portrait is not None:
        make(a.original, f'{a.name}-p', [600, 900, 1200], crop=f'crop=ih*2/3:ih:(iw-ih*2/3)*{a.portrait}:0,')
    for f in sorted(OUT.glob(f'{a.name}-*')):
        print(f'{f.name} {f.stat().st_size // 1024} KB')
