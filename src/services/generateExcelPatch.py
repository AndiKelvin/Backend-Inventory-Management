#!/usr/bin/env python3
import sys
import os
import io
import json
import re
import datetime
import zipfile
import xml.etree.ElementTree as ET

INDONESIAN_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

def main():
    if len(sys.argv) < 3:
        print("Usage: generateExcelPatch.py <template_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]

    # Read items JSON from stdin
    input_data = sys.stdin.read()
    if not input_data.strip():
        items = []
    else:
        items = json.loads(input_data)

    if not os.path.exists(template_path):
        print(f"Error: Template file not found at {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path, "rb") as f:
        template_bytes = f.read()

    in_zip = zipfile.ZipFile(io.BytesIO(template_bytes), "r")

    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    ET.register_namespace("", ns)
    ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
    ET.register_namespace("x14ac", "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac")

    sst_data = in_zip.read("xl/sharedStrings.xml")
    sheet1_data = in_zip.read("xl/worksheets/sheet1.xml")
    sheet2_data = in_zip.read("xl/worksheets/sheet2.xml")
    sheet3_data = in_zip.read("xl/worksheets/sheet3.xml")

    root_sst = ET.fromstring(sst_data)
    root_s1 = ET.fromstring(sheet1_data)
    root_s2 = ET.fromstring(sheet2_data)
    root_s3 = ET.fromstring(sheet3_data)

    # Format current date
    now = datetime.datetime.now()
    day_str = f"{now.day:02d}"
    month_name = INDONESIAN_MONTHS[now.month - 1]
    year_str = str(now.year)
    date_formatted = f"{day_str} {month_name} {year_str}"

    si_list = root_sst.findall(f"{{{ns}}}si")

    # Update Titles in SharedStrings (Index 274 = Dell, Index 275 = HP)
    if len(si_list) > 274:
        for t in si_list[274].iter(f"{{{ns}}}t"):
            if t.text and "Periode Tgl." in t.text:
                t.text = re.sub(r"Periode Tgl\.\s*.*", f"Periode Tgl. {date_formatted}", t.text)
    if len(si_list) > 275:
        for t in si_list[275].iter(f"{{{ns}}}t"):
            if t.text and "Periode Tgl." in t.text:
                t.text = re.sub(r"Periode Tgl\.\s*.*", f"Periode Tgl. {date_formatted}", t.text)

    # Helper to update cell value <v>
    def update_cell_value(root, coord, new_val):
        c = root.find(f".//{{{ns}}}c[@r=\"{coord}\"]")
        if c is not None:
            v = c.find(f"{{{ns}}}v")
            if v is None:
                v = ET.SubElement(c, f"{{{ns}}}v")
            v.text = str(new_val)

    # Helper to update breakdown text runs
    def update_si_text(idx, item):
        if idx >= len(si_list):
            return
        si = si_list[idx]
        loc_str = item.get("location", "")
        qty = item.get("qty", 0)

        def extract(pattern):
            m = re.search(pattern, loc_str, re.IGNORECASE)
            return int(m.group(1)) if m else None

        pallazo = extract(r"pallazo[^\d(]*\((\d+)\)")
        sby = extract(r"(?:sby|surabaya)[^\d(]*\((\d+)\)")
        smg = extract(r"(?:smg|semarang)[^\d(]*\((\d+)\)")
        ambas = extract(r"(?:ambas|ambassador)[^\d(]*\((\d+)\)")
        jkt = extract(r"(?:it talk\s+jkt|jakarta)[^\d(]*\((\d+)\)")
        klaim = extract(r"klaim[^\d(]*\((\d+)\)")
        service = extract(r"service[s]?[^\d(]*\((\d+)\)")

        total_it_talk = (sby or 0) + (ambas or 0) + (smg or 0)
        total_demo_it_talk = (smg or 0) + (sby or 0) + (jkt or 0)

        def replace_counts(text):
            if not text:
                return text
            s = text
            if qty == 0:
                s = re.sub(r"Pallazo \(\d+\)", "Pallazo (0)", s, flags=re.I)
                s = re.sub(r"\*TOTAL [^=]+ = \(\d+\)", lambda m: re.sub(r"\(\d+\)", "(0)", m.group(0)), s, flags=re.I)
                s = re.sub(r"IT TALK SBY \(\d+\)", "IT TALK SBY (0)", s, flags=re.I)
                s = re.sub(r"IT TALK SMG \(\d+\)", "IT TALK SMG (0)", s, flags=re.I)
                s = re.sub(r"IT TALK JKT \(\d+\)", "IT TALK JKT (0)", s, flags=re.I)
                s = re.sub(r"IT TALK AMBAS \(\d+\)", "IT TALK AMBAS (0)", s, flags=re.I)
                s = re.sub(r"^\(\d+\)", "(0)", s)
                return s

            if pallazo is not None:
                s = re.sub(r"(Pallazo[^\d(]*\()\d+(\))", rf"\g<1>{pallazo}\2", s, flags=re.I)
                s = re.sub(r"(\*TOTAL JKT[^\d(]*\()\d+(\))", rf"\g<1>{pallazo}\2", s, flags=re.I)
                s = re.sub(r"(\*TOTAL STOCK = \()\d+(\))", rf"\g<1>{pallazo}\2", s, flags=re.I)
                s = re.sub(r"^\(\d+\)", rf"({pallazo})", s)
            if sby is not None:
                s = re.sub(r"(IT TALK SBY[^\d(]*\()\d+(\))", rf"\g<1>{sby}\2", s, flags=re.I)
                s = re.sub(r"(IT TAK SBY[^\d(]*\()\d+(\))", rf"\g<1>{sby}\2", s, flags=re.I)
            if smg is not None:
                s = re.sub(r"(IT TALK SMG[^\d(]*\()\d+(\))", rf"\g<1>{smg}\2", s, flags=re.I)
                s = re.sub(r"(IT TALK SEMARANG[^\d(]*\()\d+(\))", rf"\g<1>{smg}\2", s, flags=re.I)
            if ambas is not None:
                s = re.sub(r"(IT TALK AMBAS[^\d(]*\()\d+(\))", rf"\g<1>{ambas}\2", s, flags=re.I)
            if jkt is not None:
                s = re.sub(r"(IT TALK JKT[^\d(]*\()\d+(\))", rf"\g<1>{jkt}\2", s, flags=re.I)
            if klaim is not None:
                s = re.sub(r"(HP CEK UNIT[^\d(]*\()\d+(\))", rf"\g<1>{klaim}\2", s, flags=re.I)
                s = re.sub(r"(KLAIM[^\d(]*\()\d+(\))", rf"\g<1>{klaim}\2", s, flags=re.I)
                s = re.sub(r"(\*TOTAL\s*=\s*\()\d+(\))", rf"\g<1>{klaim}\2", s, flags=re.I)
            if service is not None:
                s = re.sub(r"(TOTAL SERVICE = )\d+", rf"\g<1>{service}", s, flags=re.I)
                s = re.sub(r"(SERVICE[^\d(]*\()\d+(\))", rf"\g<1>{service}$2", s, flags=re.I)
                s = re.sub(r"(SERVICES\s*:\s*\()\d+(\))", rf"\g<1>{service}\2", s, flags=re.I)
                s = re.sub(r"(:\s*\()\d+(\)\s*-\s*unit tidak bisa)", rf": ({service}) - unit tidak bisa", s, flags=re.I)

            # Update aggregated totals in breakdown
            if total_it_talk > 0:
                s = re.sub(r"(\*TOTAL IT TALK\s*=\s*\()\d+(\))", rf"\g<1>{total_it_talk}\2", s, flags=re.I)
            if total_demo_it_talk > 0:
                s = re.sub(r"(\*TOTAL DEMO IT TALK\s*=\s*\()\d+(\))", rf"\g<1>{total_demo_it_talk}\2", s, flags=re.I)
            return s

        for t in si.iter(f"{{{ns}}}t"):
            if t.text:
                t.text = replace_counts(t.text)

    # 1. DELL UPDATES (Sheet 1)
    dell_items = {i.get("partNumber", "").strip().upper(): i for i in items if i.get("brand") == "DELL"}

    dell_map = [
        ("GA3440I5V2", ["J6", "J7"], 23),
        ("GA7330I5V1", ["J8"], 28),
        ("GA3440I7V1", ["J9", "J10"], 33),
        ("GA3440I7V2", ["J11"], 38),
        ("GA7450U7V1", ["J16"], 54),
        ("GB7010SFF5", ["J18"], 61),
        ("GB7010I7V3", ["J20"], 70),
        ("GB3000SFF", ["J21"], 73),
    ]

    for pn, cells, sst_idx in dell_map:
        if pn in dell_items:
            item = dell_items[pn]
            q = item.get("qty", 0)
            for coord in cells:
                update_cell_value(root_s1, coord, q)
            update_si_text(sst_idx, item)

    # 2. HP UPDATES (Sheet 2)
    hp_items = {i.get("partNumber", "").strip().upper(): i for i in items if i.get("brand") == "HP"}

    hp_map = [
        ("8M0Y9PA", "R9", 143),
        ("526H3PA", "R11", 152),
        ("365K6PA", "R19", 177),
        ("36F56PA", "R26", 197),
        ("61G56PA", "R29", 204),
        ("365K5PA", "R30", 210),
        ("446J7PA", "R43", 251),
        ("9J086PT", "R46", 263),
    ]

    hp_total = 0
    for pn, coord, sst_idx in hp_map:
        if pn in hp_items:
            item = hp_items[pn]
            q = item.get("qty", 0)
            hp_total += q
            update_cell_value(root_s2, coord, q)
            update_si_text(sst_idx, item)

    # Total HP in R47
    update_cell_value(root_s2, "R47", hp_total)

    # 3. DELL LAINNYA UPDATES (Sheet 3 - EXACTLY 5 products)
    other_items = {i.get("id"): i for i in items if i.get("brand") == "DELL LAINNYA"}
    other_map = [
        ("dell-other-01", "C2"),
        ("dell-other-02", "C3"),
        ("dell-other-03", "C4"),
        ("dell-other-04", "C5"),
        ("dell-other-05", "C6"),
    ]

    for item_id, coord in other_map:
        if item_id in other_items:
            update_cell_value(root_s3, coord, other_items[item_id].get("qty", 0))

    # Repack into output zip
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as out_zip:
        for zip_entry in in_zip.infolist():
            if zip_entry.filename == "xl/sharedStrings.xml":
                out_zip.writestr(zip_entry, ET.tostring(root_sst, encoding="utf-8", xml_declaration=True))
            elif zip_entry.filename == "xl/worksheets/sheet1.xml":
                out_zip.writestr(zip_entry, ET.tostring(root_s1, encoding="utf-8", xml_declaration=True))
            elif zip_entry.filename == "xl/worksheets/sheet2.xml":
                out_zip.writestr(zip_entry, ET.tostring(root_s2, encoding="utf-8", xml_declaration=True))
            elif zip_entry.filename == "xl/worksheets/sheet3.xml":
                out_zip.writestr(zip_entry, ET.tostring(root_s3, encoding="utf-8", xml_declaration=True))
            else:
                out_zip.writestr(zip_entry, in_zip.read(zip_entry.filename))

    print("OK")

if __name__ == "__main__":
    main()
