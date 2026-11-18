#!/usr/bin/env python3
"""Round Table Kingdom Set 2: deterministic, bold B/W A6 camera-target candidates.

Run: python code/build_set2.py [output-directory]
Deps: cairosvg, pillow, numpy, scipy, reportlab. Nothing fetched from internet.
No shared decorative frames: six bespoke border motifs, six distinct emblem silhouettes.

A4 portrait 4-up is geometrically full bleed: A6 rotate 90 => 105x148 mm,
2 x 105 = 210 mm exactly, 2 x 148 = 296 mm vs A4 297 mm.
Use the separately supplied printer-safe 2-up option for non-borderless printers.
"""
from __future__ import annotations
import os, sys, json, hashlib, math, io, itertools
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import cairosvg
from scipy.ndimage import gaussian_filter
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
for d in ['cards_A6','source_svg','print','check']:(ROOT/d).mkdir(parents=True,exist_ok=True)
W,H=1480,1050
PW,PH=2220,1575
BLACK='#000000';WHITE='#ffffff'
CARDS=[
 ('00','world_anchor','WORLD ANCHOR','Place first. Keep it still.','world_anchor'),
 ('01','blue_base','BLUE BASE','Blue camp goes here.','blue_base'),
 ('02','red_base','RED BASE','Red camp goes here.','red_base'),
 ('03','capture_flag','CAPTURE FLAG','The flag to fight over.','capture_flag'),
 ('04','hill','HILL','A hill rises here.','hill'),
 ('05','build_camp','BUILD CAMP','Build and mend here.','build_camp'),
]

def path(d,fill='none',stroke='none',sw=0,extras=''):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extras}/>'
def rect(x,y,w,h,fill=BLACK,rx=0,stroke='none',sw=0):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def circle(x,y,r,fill=BLACK,stroke='none',sw=0):
 return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def ellipse(x,y,rx,ry,fill=BLACK,stroke='none',sw=0):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def line(x1,y1,x2,y2,sw=12,stroke=BLACK):
 return path(f'M{x1} {y1} L{x2} {y2}',stroke=stroke,sw=sw)
def poly(points,fill=BLACK,stroke='none',sw=0):
 return '<polygon points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
def text(t,x,y,size,anchor='middle',font='DejaVu Sans',weight='900',fill=BLACK,spacing=0):
 return f'<text x="{x}" y="{y}" font-family="{font}" font-weight="{weight}" font-size="{size}" letter-spacing="{spacing}" fill="{fill}" text-anchor="{anchor}">{t}</text>'
def group(trans,s):return f'<g transform="{trans}">{s}</g>'

def star(cx,cy,ro,ri,n=8,rot=-math.pi/2,fill=BLACK):
 return poly([(round(cx+(ro if i%2==0 else ri)*math.cos(rot+i*math.pi/n),2),round(cy+(ro if i%2==0 else ri)*math.sin(rot+i*math.pi/n),2)) for i in range(2*n)],fill)

def gear(cx,cy,r_outer=90,r_inner=65,teeth=12):
 pts=[]
 for i in range(teeth*4):
  a=2*math.pi*i/(teeth*4)-math.pi/2
  rad=r_outer if i%4 in (1,2) else r_inner
  pts.append((cx+rad*math.cos(a),cy+rad*math.sin(a)))
 s=poly(pts)+circle(cx,cy,r_inner*.51,WHITE)+circle(cx,cy,r_inner*.22,BLACK)
 return s

def mouse(kind):
 """Each toy mouse is unique in size, position and action; no copied silhouettes in the large emblem."""
 pos={
  'world_anchor':(1120,640,.82,-8),
  'blue_base':(1150,676,.92,7),
  'red_base':(1050,570,.86,-12),
  'capture_flag':(380,755,.64,-9),
  'hill':(1115,780,.92,90),
  'build_camp':(280,664,.93,10)
 }
 x,y,s,a=pos[kind]
 o=''
 # long tail, body and oversized rounded ears, white eye highlights
 o+=path('M65 160 C110 205 170 179 160 139',stroke=BLACK,sw=20)
 o+=ellipse(9,140,84,94)+ellipse(9,151,49,65,WHITE)
 o+=ellipse(-48,22,60,66)+ellipse(48,19,60,66)
 o+=ellipse(-48,18,30,36,WHITE)+ellipse(48,16,30,36,WHITE)
 o+=ellipse(0,64,78,68)+ellipse(20,81,47,31,WHITE)
 o+=circle(-18,57,13,WHITE)+circle(-14,56,7)
 o+=circle(30,55,10,WHITE)+circle(32,54,6)
 o+=ellipse(66,90,19,13)+path('M57 104 Q48 124 28 116',stroke=BLACK,sw=10)
 o+=path('M52 102 L102 90 M51 111 L107 117 M-11 112 L-88 102',stroke=BLACK,sw=10)
 o+=ellipse(-57,204,32,15)+ellipse(57,204,32,15)
 # arms as filled black; pose-specific secondary prop
 if kind=='world_anchor':
  o+=line(40,144,114,113,23)+circle(126,110,48,BLACK)+circle(126,110,29,WHITE)+star(126,110,19,7,4)
 elif kind=='blue_base':
  o+=line(34,140,90,110,20)+rect(74,92,112,28,BLACK,rx=6)+circle(184,106,25,BLACK)+circle(185,106,13,WHITE)
  o+=poly([(83,110),(107,101),(107,119)],WHITE)
 elif kind=='red_base':
  o+=line(46,155,125,140,20)+circle(128,141,28,BLACK)+circle(128,141,12,WHITE)
  o+=line(145,141,180,104,16)
 elif kind=='capture_flag':
  o+=line(45,139,96,56,20)+line(96,56,145,-68,20)
  o+=poly([(135,-84),(253,-63),(219,-28),(257,12),(126,-4)])
 elif kind=='hill':
  # sleeping: stylized closed eyelids over eyes plus small pillow behind body
  o+=path('M-31 53 Q-14 66 1 54 M14 54 Q30 67 47 52',stroke=BLACK,sw=12)
  o+=ellipse(-15,206,96,20,BLACK)+ellipse(-15,200,76,13,WHITE)
 elif kind=='build_camp':
  o+=line(38,147,111,98,24)+line(113,105,134,18,17)+rect(87,-7,93,37,BLACK,rx=9)
  o+=rect(100,2,23,20,WHITE,rx=3)
 # little waist scarf: one solid triangular strip (different angle)
 if kind!='hill':o+=poly([(-54,137),(54,137),(21,156),(-5,165)],BLACK)
 return group(f'translate({x} {y}) rotate({a}) scale({s})',o)

def borders(kind):
 o=''
 if kind=='world_anchor':
  # rope runs in elongated organic loops, knots intentionally asymmetric
  for y in [246,417,605,799,927]:
   o+=path(f'M89 {y-35} Q66 {y} 90 {y+38}',stroke=BLACK,sw=23)
  for x in [252,421,629,916,1155,1330]:
   o+=path(f'M{x-46} 79 Q{x} 51 {x+46} 79',stroke=BLACK,sw=23)
  for x in [169,353,564,803,1110,1333]:
   o+=path(f'M{x-35} 978 Q{x} 1001 {x+35} 978',stroke=BLACK,sw=23)
  o+=path('M1395 224 Q1415 416 1385 589 Q1368 728 1395 925',stroke=BLACK,sw=24)
  for x,y in [(220,79),(900,79),(89,417),(1390,490),(803,978)]:
   o+=circle(x,y,21,BLACK)+circle(x,y,9,WHITE)
 elif kind=='blue_base':
  # palisade fence asymmetric heights in 4 sides; rectangular negative slots
  for i in range(7):
   y=229+i*98
   o+=rect(77,y,50,73+(i%3)*16,BLACK)
  for i in range(5):
   y=211+i*139
   o+=rect(1350,y,51,88+(i%2)*34,BLACK)
  for i in range(9):
   x=219+i*125
   o+=rect(x,72,73,35+(i%3)*16,BLACK)
  for i in range(9):
   x=160+i*143
   o+=rect(x,939,76,51,BLACK)
  o+=line(105,202,105,936,16)+line(1378,200,1378,935,16)
 elif kind=='red_base':
  for i,(x,y,rad) in enumerate([(122,278,47),(125,453,57),(117,654,42),(126,832,60),(1320,267,63),(1368,465,44),(1335,670,64),(1370,842,45),(337,101,50),(573,95,58),(825,93,44),(1070,100,59),(287,958,54),(531,948,48),(808,949,59),(1087,960,48)]):
   # teeth simplified chunky circles, interlocking
   o+=gear(x,y,rad,rad*.62,8 if i%2 else 10)
 elif kind=='capture_flag':
  # draping bunting, filled triangular pennants; deliberately different rhythms on each edge
  o+=path('M125 204 Q480 138 1360 206',stroke=BLACK,sw=14)
  for i,x in enumerate([208,390,544,740,1003,1190]):
   y=190 if i%2 else 162
   o+=poly([(x-48,y),(x+42,y),(x+7,y+58+(i%2)*25)],BLACK)
  o+=line(105,258,105,898,14)
  for y in [288,410,551,704,836]:o+=poly([(105,y-38),(197,y),(105,y+42)])
  o+=path('M1359 218 L1359 927',stroke=BLACK,sw=14)
  for y in [310,447,585,729,831]:o+=poly([(1359,y-33),(1279,y+22),(1359,y+48)])
  o+=path('M191 944 Q690 980 1270 947',stroke=BLACK,sw=14)
  for x in [248,517,736,1035]:o+=poly([(x,936),(x+31,889),(x+65,950)])
 elif kind=='hill':
  # stones around perimeter: unique irregular oblong filled outlines not reused
  import random
  rng=random.Random(4)
  stones=[]
  for i in range(12):
   x=105+i*112+rng.randrange(-11,11); y=93+rng.randrange(-12,12)
   stones.append((x,y,26+rng.randrange(5,25),15+rng.randrange(7,15)))
  for i in range(11):
   x=110+i*122+rng.randrange(-13,13);y=953+rng.randrange(-8,8)
   stones.append((x,y,25+rng.randrange(8,22),20+rng.randrange(0,16)))
  for y in [229,352,491,630,765,874]:
   stones.append((97+rng.randrange(-8,13),y,34,27))
  for y in [240,408,550,710,848]:
   stones.append((1380+rng.randrange(-9,7),y,33,30))
  for x,y,rx,ry in stones:
   o+=ellipse(x,y,rx,ry,BLACK)+path(f'M{x-rx*.45:.1f} {y-ry*.2:.1f} L{x-rx*.05:.1f} {y-ry*.65:.1f}',stroke=WHITE,sw=10)
 elif kind=='build_camp':
  # border is discrete planks with black slot nails on them, perimeter broken rhythm
  for i,x in enumerate([175,361,597,889,1110,1318]):
   o+=rect(x,82,115+(i%2)*37,39,BLACK,rx=5)+circle(x+27,99,11,WHITE)
  for i,x in enumerate([186,403,673,959,1233]):
   o+=rect(x,936,137+(i%3)*14,43,BLACK,rx=5)+circle(x+38,958,11,WHITE)
  for i,y in enumerate([266,432,601,786]):
   o+=rect(81,y,44,89+(i%2)*21,BLACK,rx=5)+circle(104,y+25,11,WHITE)
  for i,y in enumerate([238,386,585,796]):
   o+=rect(1351,y,43,112+(i%2)*14,BLACK,rx=5)+circle(1372,y+37,11,WHITE)
  o+=circle(128,166,27)+path('M116 156 L141 175 M140 156 L115 175',stroke=WHITE,sw=10)
 return o

def emblem(kind):
 o=''
 if kind=='world_anchor':
  # giant asymmetric 8-point compass with unmistakably elongated north spike
  o+=circle(694,577,244,WHITE,BLACK,20)
  o+=circle(694,577,200,WHITE,BLACK,15)
  o+=star(694,582,205,76,8)
  o+=star(694,582,131,50,8,rot=math.pi/2,fill=WHITE)
  o+=poly([(670,460),(695,245),(731,461),(696,540)],BLACK)
  o+=poly([(694,280),(707,453),(693,460)],WHITE)
  o+=circle(694,582,42,BLACK)+circle(694,582,17,WHITE)
  o+=poly([(675,226),(696,166),(724,227)],BLACK)
 elif kind=='blue_base':
  # tall planked watch tower with negative door and feather on banner; strong narrow shape
  o+=poly([(520,710),(582,708),(630,362),(674,362),(649,709),(765,707),(769,364),(822,361),(834,709),(876,707),(882,762),(488,761)],BLACK)
  o+=rect(512,312,368,75,BLACK,rx=4)
  for x in [531,603,675,748,818]:o+=rect(x,269,41,53,BLACK)
  o+=rect(572,390,246,50,BLACK)+rect(581,448,225,18,BLACK)
  o+=path('M519 389 L519 738 M882 385 L882 742',stroke=BLACK,sw=17)
  # brace: negative diagonals to read engineering
  o+=path('M601 660 L762 478',stroke=WHITE,sw=24)
  o+=path('M637 479 L789 657',stroke=WHITE,sw=22)
  o+=rect(651,633,72,109,WHITE,rx=7)
  for i in range(5):o+=line(776,508+i*39,836,508+i*39,14)
  o+=path('M802 269 L802 160',stroke=BLACK,sw=18)
  o+=poly([(815,163),(1080,193),(1026,243),(816,225)],BLACK)
  # feather negative silhouette on flag
  o+=path('M850 212 Q944 164 1023 191 Q963 199 902 230 Z',fill=WHITE)
  o+=line(891,225,998,198,11,WHITE)
 elif kind=='red_base':
  # boiler low wide, giant gear to left, asymmetric tall chimney at right
  o+=rect(482,466,585,274,BLACK,rx=122)
  o+=ellipse(498,602,98,130,BLACK)+ellipse(504,606,49,86,WHITE)
  o+=path('M543 515 L972 515',stroke=WHITE,sw=17)
  o+=rect(839,290,125,206,BLACK,rx=15)
  o+=rect(811,270,190,32,BLACK,rx=5)
  o+=path('M863 425 L915 425',stroke=WHITE,sw=18)
  o+=circle(865,631,77,WHITE)+circle(865,631,55,BLACK)+circle(865,631,19,WHITE)
  o+=gear(460,640,167,128,12)
  o+=circle(458,640,53,WHITE)+circle(458,640,22,BLACK)
  o+=rect(515,729,566,54,BLACK,rx=4)
  o+=rect(622,765,55,65,BLACK,rx=5)+rect(936,765,55,65,BLACK,rx=5)
  # leading pipe and vent make silhouette low-wide
  o+=path('M1000 488 L1111 489 Q1143 501 1143 540 L1143 651',stroke=BLACK,sw=31)
 elif kind=='capture_flag':
  # giant slanted spear/pole and flag sharply swallowtailed; sparse by design
  o+=poly([(635,777),(686,773),(820,273),(770,262)],BLACK)
  o+=poly([(807,286),(1232,344),(1123,475),(1200,580),(727,499)],BLACK)
  o+=poly([(815,332),(1158,377),(1063,466),(1150,529),(773,463)],WHITE)
  o+=poly([(794,345),(1117,387),(1034,466),(1097,500),(763,444)],BLACK)
  o+=circle(811,260,25,BLACK)
  o+=poly([(622,777),(718,761),(748,805),(604,824)],BLACK)
  o+=path('M751 319 L746 520',stroke=WHITE,sw=13)
  o+=path('M650 811 Q824 834 900 798',stroke=BLACK,sw=20)
 elif kind=='hill':
  # solid dome with broad low hill, separate giant stones, 3 simple flowers
  o+=path('M333 751 Q380 469 730 414 Q1052 405 1148 747 Q936 815 737 818 Q523 803 333 751Z',fill=BLACK)
  o+=path('M390 739 Q460 525 724 486 Q995 470 1092 743 Q890 779 746 772 Q515 773 390 739Z',fill=WHITE)
  o+=path('M455 710 Q641 638 780 675 Q934 699 1041 708',stroke=BLACK,sw=17)
  stones=[(325,756,83,62),(458,807,83,59),(604,825,88,68),(751,823,97,71),(918,810,92,63),(1093,770,88,58)]
  for x,y,rx,ry in stones:
   o+=ellipse(x,y,rx,ry,BLACK)+ellipse(x-18,y-17,rx*.5,ry*.32,WHITE)
  for x,y,r in [(585,544,36),(802,524,29),(933,625,37)]:
   for j in range(5):
    a=j*2*math.pi/5
    o+=ellipse(x+math.cos(a)*r*.7,y+math.sin(a)*r*.7,r*.47,r*.42,BLACK)
   o+=circle(x,y,r*.38,WHITE)
 elif kind=='build_camp':
  # iconic crossed tools, massive mallet head and saw over iconic workbench
  o+=rect(465,630,680,74,BLACK,rx=10)
  o+=poly([(501,701),(570,701),(533,843),(461,842)],BLACK)
  o+=poly([(1020,701),(1081,701),(1144,843),(1078,843)],BLACK)
  # mallet diagonal NW to SE
  o+=path('M540 300 L1010 669',stroke=BLACK,sw=62)
  o+=path('M551 331 L982 666',stroke=WHITE,sw=16)
  o+=group('rotate(-50 490 287)',rect(381,241,229,105,BLACK,rx=21)+rect(408,264,28,57,WHITE,rx=4))
  # thick saw NE to SW with jagged blade
  o+=path('M1039 283 L531 682',stroke=BLACK,sw=62)
  sawpts=[(1065,245),(1138,283),(1093,318),(1120,333),(1080,364),(1095,379),(1050,402),(1060,420),(1012,445),(1023,462),(976,490),(990,506),(930,551),(925,520)]
  o+=poly(sawpts)
  o+=ellipse(1099,281,35,22,WHITE)+ellipse(1099,281,15,9,BLACK)
  o+=rect(720,710,148,73,WHITE,rx=8)+circle(760,747,17,BLACK)+circle(830,747,17,BLACK)
 return o

def svg(kind,title,subtitle):
 # black triangle marker ONLY top left, inside clean 5mm printable safe margin
 # card edge blank: 0-50 (5mm); avoid all code/barcode-like patterns
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="105mm" viewBox="0 0 {W} {H}">',rect(0,0,W,H,WHITE)]
 s.append(borders(kind))
 s.append(poly([(55,55),(205,55),(55,205)],BLACK))
 s.append(emblem(kind))
 s.append(mouse(kind))
 # White title and footer plaques, black underlines vary, consistent text layout per brief
 # But no decorative cross-card features shared; only functional title/footer typography shared.
 s.append(rect(244,125,990,117,WHITE))
 font_size=96 if len(title)<12 else 85
 if title=='CAPTURE FLAG':font_size=82
 s.append(text(title,750,215,font_size,spacing=2))
 s.append(rect(252,857,995,81,WHITE))
 fs=48 if len(subtitle)<25 else 45
 s.append(text(subtitle,744,920,fs,weight='900'))
 s.append('</svg>')
 return '\n'.join(s)

def pearson(a,b):
 a=a.astype(np.float64).ravel();b=b.astype(np.float64).ravel()
 a-=a.mean();b-=b.mean()
 d=np.linalg.norm(a)*np.linalg.norm(b)
 return float(a.dot(b)/d) if d else float('nan')

def card_pngs():
 items=[]
 for cid,slug,title,sub,kind in CARDS:
  source=svg(kind,title,sub)
  (ROOT/'source_svg'/f'{cid}_{slug}.svg').write_text(source,encoding='utf8')
  p=ROOT/'cards_A6'/f'{cid}_{slug}.png'
  raw=cairosvg.svg2png(bytestring=source.encode(),output_width=PW,output_height=PH)
  # one-bit RGB gives exactly black/white pixel values (no grey or antialias pixels)
  with Image.open(io.BytesIO(raw)) as im:
   im=im.convert('L').point(lambda px:255 if px>=150 else 0).convert('1')
   im.save(p,optimize=True)
  items.append((cid,slug,title,sub,kind,p))
 return items

def run_checks(items):
 # Camera simulation: downsample to width 130 with area/LANCZOS + Gaussian blur=0.7 px
 ims=[]
 for _,slug,_,_,_,p in items:
  im=Image.open(p).convert('L').resize((130,92),Image.Resampling.LANCZOS)
  gray=gaussian_filter(np.asarray(im,dtype=np.float32)/255.,sigma=.7)
  ims.append(gray)
  Image.fromarray(np.clip(gray*255,0,255).astype('uint8')).save(ROOT/'check'/f'{slug}_130px_blurred.png')
 pair=np.zeros((6,6));rot=[]
 for i in range(6):
  for j in range(6): pair[i,j]=pearson(ims[i],ims[j])
  rot.append(pearson(ims[i],np.rot90(ims[i],2)))
 with (ROOT/'check'/'pairwise_similarity.csv').open('w') as f:
  f.write('id,'+','.join(x[1] for x in items)+'\n')
  for i,im in enumerate(items):f.write(im[1]+','+','.join(f'{v:.4f}' for v in pair[i])+'\n')
 with (ROOT/'check'/'rotated_180_similarity.csv').open('w') as f:
  f.write('id,pearson_correlation_180_rotated\n')
  for i,im in enumerate(items):f.write(f'{im[1]},{rot[i]:.4f}\n')
 # Exact camera-scale sheet: six 130px views side by side, 1:1 pixels with labels below.
 cw,ch=158,130
 camera_sheet=Image.new('RGB',(cw*6,ch),'white')
 D=ImageDraw.Draw(camera_sheet)
 ft='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
 label_font=ImageFont.truetype(ft,14)
 for i,(cid,slug,title,_,_,p) in enumerate(items):
  x=i*cw
  tiny=Image.open(ROOT/'check'/f'{slug}_130px_blurred.png').convert('RGB')
  camera_sheet.paste(tiny,(x+14,5))
  D.text((x+18,104),f'{cid} {slug[:14]}',fill='black',font=label_font)
 camera_sheet.save(ROOT/'check'/'contact_sheet_130px.png')
 # Larger contact sheet used only for human art inspection (not for similarity tests).
 cw,ch=690,570
 overview=Image.new('RGB',(cw*3,ch*2),'white')
 D=ImageDraw.Draw(overview)
 label_font=ImageFont.truetype(ft,25)
 for i,(cid,slug,title,_,_,p) in enumerate(items):
  x=(i%3)*cw;y=(i//3)*ch
  thumb=Image.open(p).convert('RGB').resize((660,468),Image.Resampling.LANCZOS)
  overview.paste(thumb,(x+15,y+15))
  D.text((x+20,y+490),f'{cid}  {title}',fill='black',font=label_font)
 overview.save(ROOT/'check'/'art_overview.png')
 # Also deliver the requested generic contact-sheet name.
 camera_sheet.save(ROOT/'check'/'contact_sheet.png')
 (ROOT/'check'/'similarity_tables.json').write_text(json.dumps({'metric':'Pearson correlation of normalized 130px-wide grayscale images after Gaussian sigma=0.7px blur','ids':[x[1] for x in items],'pairwise':pair.round(4).tolist(),'rotate_180':dict(zip([x[1] for x in items],[round(float(x),4) for x in rot])),'highest_distinct_pair':max(pair[i,j] for i in range(6) for j in range(i+1,6))},indent=2))
 # legible summary table and turn test as text too, for Claude
 with (ROOT/'check'/'SIMILARITY_TABLES.md').open('w') as f:
  f.write('# Set 2 simulated camera checks\n\n')
  f.write('Method: 130 pixels across, grayscale LANCZOS, Gaussian blur sigma 0.7px. Each number is Pearson correlation (-1 to +1). **These are NOT real camera recognition results.**\n\n')
  f.write('| Card | '+' | '.join(x[0] for x in items)+' |\n| --- |'+' --- |'*6+'\n')
  for i,x in enumerate(items):f.write('| '+x[0]+' | '+' | '.join(f'{v:.3f}' for v in pair[i])+' |\n')
  f.write('\n### 180° rotation correlation\n\n| Card | r |\n| --- | ---: |\n')
  for i,x in enumerate(items):f.write(f'| {x[0]} {x[1]} | {rot[i]:.3f} |\n')
  f.write('\nThreshold: distinct pairs should be < 0.50 (heuristic); smaller values are better. Real iPad testing at 0.4-1.5m is still required.\n')
 print('PAIRWISE MAX',max(pair[i,j] for i in range(6) for j in range(i+1,6)),'ROTATED',rot)
 return pair,rot

def print_pdf(items):
 # A4 portrait, 4 x A6 LANDSCAPE rotated into a full-bleed 2x2 portrait grid.
 # A6 landscape 148x105 mm, rotate 90 -> 105x148. A4: 2*105=210, 2*148=296 of 297.
 pagew,pageh=A4
 pdf=ROOT/'print'/'RTK_Set2_A4_Portrait_4up_100percent.pdf'
 c=canvas.Canvas(str(pdf),pagesize=A4)
 for page in range(2):
  for slot in range(4):
   idx=page*4+slot
   if idx>=len(items):continue
   _,_,_,_,_,p=items[idx]
   col=slot%2; row=slot//2
   x=col*105*mm;y=pageh-((row+1)*148+0.5)*mm
   # negative orientation? PIL rotate +90 swaps width and height preserving art content
   im=Image.open(p).convert('RGB').rotate(90,expand=True)
   c.drawImage(ImageReader(im),x,y,width=105*mm,height=148*mm,mask='auto')
  # hairline crop seam across adjacent pieces (no outside room at A4 edge)
  c.setLineWidth(0.35)
  c.setStrokeColorRGB(0,0,0)
  c.line(105*mm,pageh-0.5*mm,105*mm,pageh-296.5*mm)
  c.line(0,pageh-148.5*mm,pagew,pageh-148.5*mm)
  c.showPage()
 c.save()
 # non-borderless safe version: 2 landscape A6 cards per A4 portrait page, 3 pages
 pdf2=ROOT/'print'/'RTK_Set2_A4_Portrait_2up_Printer_Safe_100percent.pdf'
 c=canvas.Canvas(str(pdf2),pagesize=A4)
 for page in range(3):
  for slot in range(2):
   _,_,_,_,_,p=items[page*2+slot]
   x=(210-148)/2*mm;y=pageh-(40+slot*112+105)*mm
   im=Image.open(p).convert('RGB')
   c.drawImage(ImageReader(im),x,y,width=148*mm,height=105*mm,mask='auto')
   # crop ticks OUTSIDE the art, outside card edges
   c.setStrokeColorRGB(0.25,0.25,0.25);c.setLineWidth(.35)
   mark=5*mm;gap=2*mm
   for xx in [x,x+148*mm]:
    for yy in [y,y+105*mm]:
     side=-1 if xx==x else 1
     up=-1 if yy==y else 1
     c.line(xx+side*gap,yy,xx+side*mark,yy)
     c.line(xx,yy+up*gap,xx,yy+up*mark)
  c.showPage()
 c.save()
 return pdf,pdf2

def manifest(items):
 out={'set':'Round Table Kingdom AR placement cards - set 2','status':'camera target CANDIDATES; no device testing','dimensions_mm':{'width':148,'height':105},'raster_pixels':{'width':PW,'height':PH},'ink':'pure black/white, no gray', 'cards':[]}
 for cid,slug,title,sub,kind,p in items:
  buf=p.read_bytes()
  out['cards'].append({'id':cid,'type':kind,'title':title,'instruction':sub,'file':str(p.relative_to(ROOT)), 'size_mm':[148,105],'size_px':[PW,PH],'sha256':hashlib.sha256(buf).hexdigest()})
 (ROOT/'manifest.json').write_text(json.dumps(out,indent=2))

if __name__=='__main__':
 items=card_pngs();pair,rot=run_checks(items);print_pdf(items);manifest(items)
 print('DONE',ROOT)
