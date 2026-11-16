import json, re, unicodedata, sys
from wordfreq import zipf_frequency

def norm(w):
    w = w.lower().replace('œ', 'oe').replace('æ', 'ae')
    w = unicodedata.normalize('NFD', w)
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return w

raw = json.load(open('node_modules/an-array-of-french-words/index.json', encoding='utf-8'))
words = set()
best = {}  # normalized -> max zipf over accented variants
for w in raw:
    n = norm(w)
    if not re.fullmatch(r'[a-z]{3,16}', n):
        continue
    words.add(n)
    z = zipf_frequency(w, 'fr')
    if z > best.get(n, 0):
        best[n] = z

BLOCK = set('''bite bites chatte chattes con cons conne connes conasse cul culs encule encules enculer foutre
merde merdes nique niquer pute putes putain putains salope salopes tapin viol viols violer facho fachos negre negres
pede pedes pd pede nazi nazis'''.split())

common = sorted((w, round(z * 10)) for w, z in best.items() if z >= 3.0 and len(w) <= 12 and w not in BLOCK)
allw = sorted(words)
open('data/words.txt', 'w').write('\n'.join(allw))
open('data/common.txt', 'w').write('\n'.join(f'{w} {z}' for w, z in common))
print('dict', len(allw), 'common', len(common))
import collections
print(collections.Counter(len(w) for w, _ in common))
print([w for w, z in common if len(w) == 7 and len(set(w)) == 7][:30])
