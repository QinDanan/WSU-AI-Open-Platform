"""Extract the authentic school emblem from the public school charter (page 2)."""
from __future__ import annotations
import sys
import urllib.request
from pathlib import Path

CHARTER = "https://www.wsyu.edu.cn/_upload/article/files/e4/f6/95830c01431aa36195abe1f98229/b5190731-2226-4cc4-a527-30035884e023.pdf"
OUTPUT = Path("assets/school-emblem.png")

def main() -> int:
    try:
        import fitz
        request=urllib.request.Request(CHARTER,headers={"User-Agent":"Mozilla/5.0 (compatible; AcademicPortal/1.0)","Accept":"application/pdf,*/*"})
        with urllib.request.urlopen(request,timeout=30) as response:
            pdf=response.read(8_000_000)
        if not pdf.startswith(b"%PDF-"):
            print("Public charter response is not a PDF")
            return 1
        doc=fitz.open(stream=pdf,filetype="pdf")
        page=doc[1]
        images=[]
        for obj in page.get_images(full=True):
            xref=obj[0]
            pix=fitz.Pixmap(doc,xref)
            if pix.width < 80 or pix.height < 80:
                continue
            ratio=pix.width/pix.height
            if .75<=ratio<=1.33:
                images.append((pix.width*pix.height, pix))
        if not images:
            print("No square emblem image object on charter page 2")
            return 1
        images.sort(key=lambda x:x[0],reverse=True)
        pix=images[0][1]
        if pix.colorspace is None or pix.n>4:
            pix=fitz.Pixmap(fitz.csRGB,pix)
        OUTPUT.parent.mkdir(parents=True,exist_ok=True)
        pix.save(str(OUTPUT))
        print(f"Extracted school emblem {pix.width}x{pix.height}, {OUTPUT.stat().st_size} bytes")
        return 0
    except Exception as e:
        print(f"Official emblem extraction unavailable: {e!r}")
        return 1

if __name__=='__main__':
    raise SystemExit(main())
