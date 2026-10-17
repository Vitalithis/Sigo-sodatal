#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extractor 100% GRATIS y Local de Comprobantes de Pago y Cartolas Bancarias Chilenas.
Soporta:
1. Comprobantes individuales y Vouchers POS (1-3 páginas, vía pypdf y RapidOCR).
2. Cartolas Bancarias masivas (de 1 a cientos de páginas, extrayendo cada movimiento/abono).
"""

import sys
import os
import re
import json
from typing import Dict, Any, Optional, List

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from rapidocr_onnxruntime import RapidOCR
    ocr_engine = RapidOCR()
except ImportError:
    ocr_engine = None


BANCOS_CONOCIDOS = [
    ("BancoEstado", [r"banco\s*estado", r"bancoestado", r"cuenta\s*rut", r"\bestado\b"]),
    ("Banco Santander", [r"santander", r"banco\s*santander"]),
    ("Banco de Chile", [r"banco\s*de\s*chile", r"edwards", r"bancochile"]),
    ("BCI", [r"\bbci\b", r"cr[eé]dito\s*e\s*inversiones", r"\bmach\b"]),
    ("Scotiabank", [r"scotiabank", r"scotia"]),
    ("Banco Itaú", [r"ita[uú]", r"banco\s*ita[uú]"]),
    ("Banco Falabella", [r"falabella", r"\bcmr\b"]),
    ("Banco BICE", [r"\bbice\b"]),
    ("Banco Security", [r"security"]),
    ("Banco Consorcio", [r"consorcio"]),
    ("Tenpo", [r"\btenpo\b"]),
    ("Coopeuch", [r"coopeuch"]),
    ("Transbank", [r"transbank", r"redcompra", r"webpay"]),
    ("Getnet", [r"getnet"]),
    ("Mercado Pago", [r"mercado\s*pago"]),
    ("Compraquí", [r"compraqu[ií]"]),
    ("Klap", [r"\bklap\b"]),
    ("SumUp", [r"sumup", r"sum\s*up"])
]

MESES_ES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
}


def detectar_banco(texto: str) -> Optional[str]:
    texto_lower = texto.lower()
    for nombre_banco, patrones in BANCOS_CONOCIDOS:
        for p in patrones:
            if re.search(p, texto_lower):
                return nombre_banco
    return None


def formatear_rut(rut_raw: str) -> Optional[str]:
    limpio = re.sub(r"[^0-9kK]", "", rut_raw).upper()
    if len(limpio) < 8 or len(limpio) > 9:
        return None
    cuerpo = limpio[:-1]
    dv = limpio[-1]
    cuerpo_fmt = f"{int(cuerpo):,}".replace(",", ".")
    return f"{cuerpo_fmt}-{dv}"


def extraer_movimientos_cartola_bancoestado(reader) -> List[Dict[str, Any]]:
    # Regex para línea de movimiento en BancoEstado:
    # FECHA $ MONTO DESCRIPCION $ SALDO N_DOC SUCURSAL
    pat = re.compile(r"^(\d{2}/\d{2}/\d{4})\s+\$\s*([0-9\.]+)\s+(.*?)\s+\$\s*([0-9\.]+)\s+([0-9]+)\s*(.*)$")
    movimientos = []
    
    # Procesar páginas
    for page in reader.pages:
        t = page.extract_text()
        if not t:
            continue
        for line in t.splitlines():
            m = pat.match(line.strip())
            if m:
                fecha_raw, monto_raw, desc, saldo, num_doc, sucursal = m.groups()
                monto = int(monto_raw.replace(".", ""))
                
                # Descartar montos en 0
                if monto <= 0:
                    continue

                # Formatear fecha DD/MM/YYYY a YYYY-MM-DD
                partes = fecha_raw.split("/")
                fecha_iso = f"{partes[2]}-{partes[1]}-{partes[0]}"

                desc_limpia = desc.strip()
                
                # Detectar RUT del emisor al inicio de la descripción (ej: 0776618101 -> 77.661.810-1)
                rut = None
                m_rut = re.match(r"^0?(\d{7,8})(\d|k|K)\b", desc_limpia)
                if m_rut:
                    cuerpo, dv = m_rut.groups()
                    cuerpo_fmt = f"{int(cuerpo):,}".replace(",", ".")
                    rut = f"{cuerpo_fmt}-{dv.upper()}"

                # Detectar tipo de origen y método
                desc_lower = desc_limpia.lower()
                if "getnet" in desc_lower or "transbank" in desc_lower or "dbtran" in desc_lower:
                    origen = "VOUCHER_POS"
                    metodo = "TARJETA"
                elif "caja vecina" in desc_lower or "ventanilla" in desc_lower:
                    origen = "DEPOSITO_VENTANILLA"
                    metodo = "EFECTIVO"
                else:
                    origen = "TRANSFERENCIA_BANCARIA"
                    metodo = "TRANSFERENCIA"

                # Nro de operación / documento
                num_op = num_doc.strip()
                if not num_op or num_op == "0":
                    # Si no trae num_doc, generar un identificador determinista único
                    num_op = f"DOC-{fecha_raw.replace('/', '')}-{monto}-{len(movimientos) + 1}"

                movimientos.append({
                    "origen_documento": origen,
                    "banco_origen": "BancoEstado",
                    "monto": monto,
                    "fecha_transaccion": fecha_iso,
                    "num_operacion": num_op,
                    "rut_emisor": rut,
                    "metodo_pago": metodo,
                    "observaciones": desc_limpia
                })

    return movimientos


def detectar_monto(texto: str) -> int:
    rut_detectado = detectar_rut(texto)
    rut_limpio = rut_detectado.replace(".", "").split("-")[0] if rut_detectado else ""

    lineas = texto.splitlines()
    for linea in lineas:
        if re.search(r"\b(monto|total|valor|importe|transferido|pagado|cargo|abono)\b", linea, re.IGNORECASE):
            m_miles = re.findall(r"\b([0-9]{1,3}(?:\.[0-9]{3})+)\b", linea)
            for cand in m_miles:
                val = int(cand.replace(".", ""))
                if str(val) != rut_limpio and 500 <= val <= 50000000:
                    return val

            m_digitos = re.findall(r"\$?\s*([0-9]{3,8})\b", linea)
            for cand in m_digitos:
                val = int(cand)
                if str(val) != rut_limpio and 500 <= val <= 50000000:
                    return val

    matches_signo = re.findall(r"\$\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{3,8})", texto)
    for m in matches_signo:
        val_str = m.replace(".", "").strip()
        if val_str.isdigit() and val_str != rut_limpio:
            val = int(val_str)
            if 500 <= val <= 50000000:
                return val

    candidatos_miles = re.findall(r"\b([0-9]{1,3}\.[0-9]{3}(?:\.[0-9]{3})?)\b", texto)
    for c in candidatos_miles:
        val = int(c.replace(".", ""))
        if str(val) != rut_limpio and 1000 <= val <= 50000000:
            return val

    return 0


def detectar_num_operacion(texto: str) -> str:
    patrones = [
        r"(?:n[úu]mero\s*(?:de)?\s*(?:operaci[óo]n|transacci[óo]n|transferencia|comprobante|folio)|c[óo]digo\s*(?:de)?\s*(?:autorizaci[óo]n|operaci[óo]n)|n[°º]\s*operaci[óo]n|c[óo]d\.?\s*aut\.?|aut\.?|folio)[\s\:\#\-]*([a-zA-Z0-9\-_]{4,24})",
        r"(?:operaci[óo]n|transacci[óo]n|comprobante)[\s\:\#\-]*([0-9]{4,18})",
        r"\b(?:op|tx|folio)[\s\:\#]*([0-9]{5,16})\b"
    ]

    for pat in patrones:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            num = m.group(1).strip()
            if not re.match(r"^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}$", num):
                return num

    numeros_aislados = re.findall(r"\b([0-9]{6,12})\b", texto)
    for n in numeros_aislados:
        if not n.startswith("2026") and not n.startswith("2025") and not n.startswith("2024"):
            return n

    return ""


def detectar_rut(texto: str) -> Optional[str]:
    patron_rut = r"\b([0-9]{1,2}(?:\.[0-9]{3}){2}-[\dkK]|[0-9]{7,8}-[\dkK])\b"
    matches = re.findall(patron_rut, texto, re.IGNORECASE)
    if matches:
        return matches[0].upper()
    return None


def detectar_fecha(texto: str) -> Optional[str]:
    m_num = re.search(r"\b([0-3]?[0-9])[\/\-]([0-1]?[0-9])[\/\-]((?:20)?[0-9]{2})\b", texto)
    if m_num:
        dia, mes, anio = m_num.groups()
        if len(anio) == 2:
            anio = "20" + anio
        
        m_hora = re.search(r"\b([0-2]?[0-9]):([0-5][0-9])(?::([0-5][0-9]))?\b", texto)
        if m_hora:
            h, mi, s = m_hora.groups()
            s = s or "00"
            return f"{anio}-{int(mes):02d}-{int(dia):02d}T{int(h):02d}:{int(mi):02d}:{int(s):02d}"
        return f"{anio}-{int(mes):02d}-{int(dia):02d}"

    m_texto = re.search(r"\b([0-3]?[0-9])\s+de\s+([a-zA-Z]+)\s+(?:del?\s+)?((?:20)?[0-9]{2})\b", texto, re.IGNORECASE)
    if m_texto:
        dia, mes_nombre, anio = m_texto.groups()
        mes_nombre_l = mes_nombre.lower()
        if mes_nombre_l in MESES_ES:
            mes = MESES_ES[mes_nombre_l]
            if len(anio) == 2:
                anio = "20" + anio
            return f"{anio}-{mes}-{int(dia):02d}"

    return None


def procesar_comprobante(filepath: str) -> Dict[str, Any]:
    if not os.path.exists(filepath):
        return {
            "es_legible": False,
            "error": f"Archivo no encontrado: {filepath}"
        }

    ext = os.path.splitext(filepath)[1].lower()
    es_pdf = ext == ".pdf"

    if es_pdf and PdfReader:
        try:
            reader = PdfReader(filepath)
            # Analizar primera página para detectar si es Cartola Bancaria
            p1_text = reader.pages[0].extract_text() if len(reader.pages) > 0 else ""
            p1_lower = p1_text.lower()
            
            es_cartola = "cartola" in p1_lower or ("detalle movimientos" in p1_lower and "cta.cte" in p1_lower)
            
            if es_cartola:
                movimientos = extraer_movimientos_cartola_bancoestado(reader)
                banco = detectar_banco(p1_text) or "BancoEstado"
                return {
                    "es_cartola": True,
                    "banco_origen": banco,
                    "total_movimientos": len(movimientos),
                    "movimientos": movimientos,
                    "es_legible": len(movimientos) > 0,
                    "advertencias": []
                }
        except Exception as e:
            pass

    # Caso B: Comprobante Individual o Imagen/Foto
    texto = ""
    try:
        if es_pdf and PdfReader:
            reader = PdfReader(filepath)
            limite = min(len(reader.pages), 5)
            textos = [reader.pages[i].extract_text() for i in range(limite) if reader.pages[i].extract_text()]
            texto = "\n".join(textos)
        
        # Si no hubo texto en el PDF o es imagen, ejecutar OCR
        if not texto.strip() and ocr_engine:
            result, _ = ocr_engine(filepath)
            if result:
                texto = "\n".join([item[1] for item in result if item and len(item) > 1 and item[1]])
    except Exception as e:
        return {
            "es_legible": False,
            "error": f"Fallo en lectura de archivo: {str(e)}"
        }

    if not texto.strip():
        return {
            "es_cartola": False,
            "origen_documento": "OTRO",
            "banco_origen": None,
            "monto": 0,
            "fecha_transaccion": None,
            "num_operacion": "",
            "rut_emisor": None,
            "metodo_pago": "TRANSFERENCIA",
            "confianza": 0.0,
            "advertencias": ["El documento está en blanco o no contiene texto legible"],
            "es_legible": False,
            "texto_extraido": ""
        }

    banco = detectar_banco(texto)
    monto = detectar_monto(texto)
    num_op = detectar_num_operacion(texto)
    rut = detectar_rut(texto)
    fecha = detectar_fecha(texto)

    t_lower = texto.lower()
    if any(k in t_lower for k in ["transbank", "redcompra", "voucher", "voucher pos", "getnet", "terminal pos", "compraqui", "sumup", "klap"]):
        origen_doc = "VOUCHER_POS"
        metodo_pago = "TARJETA"
    elif any(k in t_lower for k in ["deposito", "caja vecina", "ventanilla"]):
        origen_doc = "DEPOSITO_VENTANILLA"
        metodo_pago = "EFECTIVO"
    else:
        origen_doc = "TRANSFERENCIA_BANCARIA"
        metodo_pago = "TRANSFERENCIA"

    advertencias: List[str] = []
    puntos_confianza = 0.0

    if monto > 0:
        puntos_confianza += 0.35
    else:
        advertencias.append("No se detectó un monto monetario claro")

    if num_op:
        puntos_confianza += 0.35
    else:
        advertencias.append("No se identificó número de operación o folio")

    if banco:
        puntos_confianza += 0.15

    if fecha:
        puntos_confianza += 0.10

    if rut:
        puntos_confianza += 0.05

    confianza = round(min(1.0, puntos_confianza), 2)
    es_legible = (monto > 0 or bool(num_op))

    return {
        "es_cartola": False,
        "origen_documento": origen_doc,
        "banco_origen": banco,
        "monto": monto,
        "fecha_transaccion": fecha,
        "num_operacion": num_op,
        "rut_emisor": rut,
        "metodo_pago": metodo_pago,
        "confianza": confianza,
        "advertencias": advertencias,
        "es_legible": es_legible,
        "texto_extraido": texto[:400]
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: python extractor_comprobantes.py <ruta_archivo>"}))
        sys.exit(1)

    archivo = sys.argv[1]
    resultado = procesar_comprobante(archivo)
    print(json.dumps(resultado, ensure_ascii=False))
