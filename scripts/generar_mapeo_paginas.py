#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import json
import glob
from pypdf import PdfReader

def procesar_archivos():
    uploads_dir = os.path.join(os.getcwd(), 'public', 'uploads', 'comprobantes')
    pdf_files = glob.glob(os.path.join(uploads_dir, '*.pdf'))
    pat = re.compile(r"^(\d{2}/\d{2}/\d{4})\s+\$\s*([0-9\.]+)\s+(.*?)\s+\$\s*([0-9\.]+)\s+([0-9]+)\s*(.*)$")
    
    total_mapeados = 0
    mapa_general = {}

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        url_archivo = f"/uploads/comprobantes/{filename}"
        try:
            reader = PdfReader(pdf_path)
            for page_num, page in enumerate(reader.pages, start=1):
                txt = page.extract_text() or ''
                for line in txt.splitlines():
                    m = pat.match(line.strip())
                    if m:
                        fecha_raw, monto_raw, desc, saldo, num_doc, sucursal = m.groups()
                        monto = int(monto_raw.replace('.', ''))
                        num_op = num_doc.strip()
                        key = f"{url_archivo}___{num_op}___{monto}"
                        mapa_general[key] = {
                            "pagina": page_num,
                            "linea_original": line.strip(),
                            "fecha": fecha_raw,
                            "num_operacion": num_op,
                            "monto": monto,
                            "glosa": desc.strip()
                        }
                        total_mapeados += 1
        except Exception as e:
            print(f"Error procesando {filename}: {e}")

    out_file = os.path.join(uploads_dir, 'mapa_paginas.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(mapa_general, f, ensure_ascii=False)

    print(f"Generado mapa con {len(mapa_general)} operaciones en {out_file}")

if __name__ == '__main__':
    procesar_archivos()
