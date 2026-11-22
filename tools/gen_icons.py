#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA / Electron 所需的应用图标（无需联网）。"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'icons')
os.makedirs(BASE, exist_ok=True)

TOP = (33, 84, 216)     # #2154d8
BOT = (75, 134, 247)    # #4b86f7


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1) if size > 1 else 0
        c = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img.convert('RGBA')


def load_font(size):
    for p in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/seguisb.ttf',
              'C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf'):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_pl(img, size):
    d = ImageDraw.Draw(img)
    f = load_font(int(size * 0.52))
    t = 'PL'
    bb = d.textbbox((0, 0), t, font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x = (size - w) / 2 - bb[0]
    y = (size - h) / 2 - bb[1]
    d.text((x, y), t, font=f, fill=(255, 255, 255, 255))


def rounded(size, ratio=0.22):
    img = gradient(size)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                           radius=int(size * ratio), fill=255)
    img.putalpha(mask)
    draw_pl(img, size)
    return img


def full(size):
    img = gradient(size)
    draw_pl(img, size)
    return img


# 普通图标（圆角）
rounded(192).save(os.path.join(BASE, 'icon-192.png'))
rounded(512).save(os.path.join(BASE, 'icon-512.png'))
# 遮罩图标（全出血，内容位于安全区）
full(192).save(os.path.join(BASE, 'icon-maskable-192.png'))
full(512).save(os.path.join(BASE, 'icon-maskable-512.png'))
# Apple Touch / favicon
full(180).save(os.path.join(BASE, 'apple-touch-icon.png'))
rounded(64, 0.25).save(os.path.join(BASE, 'favicon.png'))
# Windows ICO（供 Electron 打包）
ico = rounded(256, 0.2)
ico.save(os.path.join(BASE, 'icon.ico'), format='ICO',
         sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

print('icons generated ->', BASE)
