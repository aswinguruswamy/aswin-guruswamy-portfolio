# EXPLAIN: résumé privacy check (D51 v0, NFR-05). public/resume.pdf is public, so CI stops the merge when it has:
# an email address, a phone number, a mailto or tel link, any image (Aswin's photo is never uploaded),
# or an Amazon title that is not D6 v1. Run: python3 scripts/check-resume.py [file]
import re, sys
from pypdf import PdfReader

path = sys.argv[1] if len(sys.argv) > 1 else 'public/resume.pdf'
r = PdfReader(path)
text = ''.join(p.extract_text() or '' for p in r.pages)
flat = re.sub(r'\s+', ' ', text)
fails = []
if re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text, re.I): fails.append('an email address is in the text')
if re.search(r'\(?\+?\d[\d\s().-]{8,}\d', re.sub(r'\d{1,3}(,\d{3})+|\d+–\d+|\d{4}\s*–\s*\d{4}', '', text)) and re.search(r'\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}', text):
    fails.append('a phone number is in the text')
for i, p in enumerate(r.pages):
    for a in p.get('/Annots') or []:
        u = str(a.get_object().get('/A', {}).get('/URI', ''))
        if u.startswith(('mailto:', 'tel:')): fails.append(f'page {i + 1}: a {u.split(":")[0]} link')
    if len(p.images): fails.append(f'page {i + 1}: {len(p.images)} image(s)')
if 'Kindle SGX Operations (Notification Team)' not in flat: fails.append('the Amazon title is not D6 v1 ("Kindle SGX Operations (Notification Team)")')
for f in fails: print('FAIL résumé:', f)
print(f'RESULT: FAIL ({len(fails)})' if fails else f'RESULT: PASS ({len(r.pages)} pages)')
sys.exit(1 if fails else 0)
