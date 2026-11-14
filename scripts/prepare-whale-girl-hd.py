"""Prepare local animation plates from the user's referenced artwork, without AI generation.

Originals stay in references/. Only eyelid/mouth overlays are derived here;
the separate interaction poses remain unmodified. See THIRD_PARTY_NOTICES.md.
"""
from pathlib import Path
import shutil
import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/whale-girl-hd'
OUT.mkdir(parents=True, exist_ok=True)
base = Image.open(ROOT / 'references/deepseek-whale-girl-icon/improved-1.png').convert('RGBA')

def skin_patch(image, points):
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(.65))
    return Image.composite(Image.new('RGBA', image.size, (253, 240, 232, 255)), image, mask)

def curve(draw, points, fill, width):
    a, b, c, d = points
    samples = []
    for i in range(65):
        t = i / 64
        samples.append(tuple((1-t)**3*a[k] + 3*(1-t)**2*t*b[k] + 3*(1-t)*t*t*c[k] + t**3*d[k] for k in (0, 1)))
    draw.line(samples, fill=fill, width=width, joint='curve')

def close_mouth(image):
    result = skin_patch(image, [(411,508),(469,507),(478,525),(477,548),(462,565),(434,566),(414,548)])
    curve(ImageDraw.Draw(result), [(428,533),(438,542),(448,542),(458,533)], (81,57,56,255), 4)
    return result

def close_eyes(image):
    left = [(286,459),(298,436),(305,428),(306,418),(317,424),(323,419),(326,412),(337,418),(352,416),(370,424),(385,438),(394,453),(394,477),(382,499),(362,511),(333,514),(310,505),(295,484)]
    right = [(489,438),(498,422),(516,409),(539,400),(558,398),(574,402),(581,396),(590,401),(584,410),(597,422),(604,442),(593,476),(571,493),(548,503),(517,499),(500,480)]
    region = Image.new('L', image.size)
    region_draw = ImageDraw.Draw(region)
    region_draw.rectangle((286,412,396,518), fill=255)
    region_draw.rectangle((486,401,605,511), fill=255)
    pixels = image.load()
    hair = Image.new('L', image.size)
    hair_pixels = hair.load()
    def iris(x, y):
        return ((x-355)/39)**2 + ((y-469)/44)**2 < 1.1 or ((x-530)/42)**2 + ((y-459)/49)**2 < 1.1
    for y in range(390, 518):
        for x in range(280, 610):
            r, g, b, a = pixels[x,y]
            if b > r + 6 and not iris(x,y):
                hair_pixels[x,y] = 255
    hair = hair.filter(ImageFilter.MaxFilter(7))
    mask = Image.new('L', image.size)
    mask_pixels = mask.load()
    region_pixels = region.load()
    hair_pixels = hair.load()
    skin = image.copy()
    skin_pixels = skin.load()
    for y in range(390, 522):
        for x in range(280, 610):
            if not region_pixels[x,y] or hair_pixels[x,y]:
                continue
            r, g, b, a = pixels[x,y]
            mask_pixels[x,y] = 255
            blush = max(math.exp(-((x-327)/42)**2/2-((y-529)/22)**2/2), math.exp(-((x-548)/42)**2/2-((y-521)/22)**2/2))
            skin_pixels[x,y] = (253, round(240-46*blush), round(232-36*blush), 255)
    # Only replace eye pixels. Preserve the original bangs, outlines and cheek shading.
    mask = ImageChops.subtract(mask.filter(ImageFilter.GaussianBlur(1.2)), hair)
    result = Image.composite(skin, image, mask)
    draw = ImageDraw.Draw(result)
    curve(draw, [(302,466),(322,483),(353,483),(376,467)], (59,42,43,255), 6)
    curve(draw, [(502,459),(521,475),(549,474),(576,456)], (59,42,43,255), 6)
    return result

base.save(OUT / 'speaking.png')
neutral = close_mouth(base)
neutral.save(OUT / 'idle.png')
close_eyes(neutral).save(OUT / 'blink.png')
close_eyes(base).save(OUT / 'speaking-blink.png')
poses = ROOT / 'references/DeepSeek-Whale-Girl/assets/whale'
for name, original in [('headpat', 'whale-headpat'), ('fed', 'whale-satiated'), ('drag', 'whale-drag-panic'), ('run', 'whale-idle-running')]:
    shutil.copy2(poses / f'{original}.png', OUT / f'{name}.png')
print('Prepared', len(list(OUT.glob('*.png'))), 'high-resolution plates in', OUT)
