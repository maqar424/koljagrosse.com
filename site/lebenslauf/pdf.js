// pdf.js - Erzeugt eine einseitige DIN-A4-PDF als echte Vektorgrafik.
// Statt die Seite als Bild abzufotografieren, werden Text, Linien und
// Farbflaechen direkt aus dem gerenderten DOM in PDF-Befehle uebersetzt:
// verlustfrei zoombar, markierbarer Text, wenige KB Dateigroesse.
(function () {
    'use strict';

    const A4_RATIO = 297 / 210;

    // Helvetica (PDF-Standardschrift) ist metrisch fast identisch mit Arial.
    // Vertikale Metriken zur Baseline-Berechnung:
    const ASCENT = 0.905;          // Anteil der Schriftgroesse ueber der Baseline
    const INHALTS_HOEHE = 1.15;    // Hoehe des Textinhalts relativ zur Schriftgroesse

    function parseFarbe(str) {
        const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(str);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    }

    // Einen Textknoten in seine gerenderten Zeilen zerlegen (Position pro Zeile)
    function zeilenAusTextKnoten(node) {
        const text = node.textContent;
        const range = document.createRange();
        const zeilen = [];
        let z = null;
        for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rects = range.getClientRects();
            if (!rects.length) continue; // kollabierter Whitespace ohne eigene Box
            const r = rects[0];
            if (r.width < 0.1) continue;  // Zeilenumbrüche/Einrückung aus dem HTML
            if (z && Math.abs(r.top - z.top) < 2) {
                z.text += text[i];
                z.right = Math.max(z.right, r.right);
            } else {
                if (z) zeilen.push(z);
                z = { text: text[i], left: r.left, top: r.top, right: r.right, height: r.height };
            }
        }
        if (z) zeilen.push(z);
        zeilen.forEach(function (zeile) {
            // Ein im Quelltext kollabierter Umbruch wird als Leerzeichen gerendert
            zeile.text = zeile.text.replace(/[\n\r\t]/g, ' ').replace(/\s+$/, '');
        });
        return zeilen.filter(function (zeile) { return zeile.text.length > 0; });
    }

    // Hintergruende und Rahmenlinien (Header-Flaeche, <hr>, Unterstreichungen)
    function zeichneBoxen(pdf, element, basis, mmProPx) {
        const alle = [element].concat(Array.prototype.slice.call(element.querySelectorAll('*')));
        alle.forEach(function (el) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            const r = el.getBoundingClientRect();
            if (r.width < 0.5 || r.height < 0.5) return;
            const x = (r.left - basis.left) * mmProPx;
            const y = (r.top - basis.top) * mmProPx;

            const bg = parseFarbe(cs.backgroundColor);
            if (bg && bg.a > 0.01 && !(bg.r === 255 && bg.g === 255 && bg.b === 255)) {
                pdf.setFillColor(bg.r, bg.g, bg.b);
                pdf.rect(x, y, r.width * mmProPx, r.height * mmProPx, 'F');
            }

            ['Top', 'Bottom'].forEach(function (seite) {
                const dicke = parseFloat(cs['border' + seite + 'Width']);
                if (!dicke || cs['border' + seite + 'Style'] === 'none') return;
                const farbe = parseFarbe(cs['border' + seite + 'Color']);
                if (!farbe || farbe.a < 0.01) return;
                const ly = seite === 'Top'
                    ? y + (dicke * mmProPx) / 2
                    : y + r.height * mmProPx - (dicke * mmProPx) / 2;
                pdf.setDrawColor(farbe.r, farbe.g, farbe.b);
                pdf.setLineWidth(dicke * mmProPx);
                if (farbe.a < 1) pdf.setGState(new pdf.GState({ 'stroke-opacity': farbe.a }));
                pdf.line(x, ly, x + r.width * mmProPx, ly);
                if (farbe.a < 1) pdf.setGState(new pdf.GState({ 'stroke-opacity': 1 }));
            });
        });
    }

    // Saemtlichen sichtbaren Text zeilenweise als echten PDF-Text setzen
    function zeichneText(pdf, element, basis, mmProPx) {
        const ptProPx = mmProPx * (72 / 25.4);
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!node.textContent.trim()) continue;
            const eltern = node.parentElement;
            if (!eltern) continue;
            const cs = getComputedStyle(eltern);
            const groessePx = parseFloat(cs.fontSize);
            const fett = parseInt(cs.fontWeight, 10) >= 600;
            const kursiv = cs.fontStyle === 'italic';
            const farbe = parseFarbe(cs.color) || { r: 0, g: 0, b: 0 };
            const stil = fett && kursiv ? 'bolditalic' : fett ? 'bold' : kursiv ? 'italic' : 'normal';

            pdf.setFont('helvetica', stil);
            pdf.setFontSize(groessePx * ptProPx);
            pdf.setTextColor(farbe.r, farbe.g, farbe.b);

            zeilenAusTextKnoten(node).forEach(function (zeile) {
                const x = (zeile.left - basis.left) * mmProPx;
                // Baseline innerhalb der Zeilenbox bestimmen
                const halberDurchschuss = (zeile.height - groessePx * INHALTS_HOEHE) / 2;
                const baselinePx = zeile.top + halberDurchschuss + groessePx * ASCENT;
                const y = (baselinePx - basis.top) * mmProPx;

                // Breite exakt an das Browser-Layout angleichen (Helvetica vs. Arial,
                // Blocksatz): Differenz gleichmaessig auf die Zeichen verteilen
                const zielBreite = (zeile.right - zeile.left) * mmProPx;
                const natBreite = pdf.getTextWidth(zeile.text);
                let charSpace = 0;
                const diff = zielBreite - natBreite;
                if (zeile.text.length > 1 && Math.abs(diff) < zielBreite * 0.15) {
                    charSpace = diff / (zeile.text.length - 1);
                }
                pdf.text(zeile.text, x, y, charSpace ? { charSpace: charSpace } : undefined);
            });
        }
    }

    // Bilder (z.B. Unterschrift) als eingebettetes PNG uebernehmen.
    // Umweg ueber ein Canvas: erhaelt die Transparenz (Alpha-Kanal -> SMask im PDF)
    // und laeuft synchron, da die Bilder im DOM bereits geladen sind.
    function zeichneBilder(pdf, element, basis, mmProPx) {
        element.querySelectorAll('img').forEach(function (img) {
            const r = img.getBoundingClientRect();
            if (r.width < 0.5 || r.height < 0.5) return;
            if (!img.complete || img.naturalWidth === 0) return; // nicht geladen
            // Einbett-Aufloesung auf ~300 DPI der Druckgroesse begrenzen (nicht
            // hochskalieren): scharf genug, aber kleine Dateigroesse
            const druckPx = Math.ceil((r.width * mmProPx) / 25.4 * 300);
            const skala = Math.min(1, druckPx / img.naturalWidth);
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.naturalWidth * skala));
            c.height = Math.max(1, Math.round(img.naturalHeight * skala));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            try {
                pdf.addImage(
                    c.toDataURL('image/png'),
                    'PNG',
                    (r.left - basis.left) * mmProPx,
                    (r.top - basis.top) * mmProPx,
                    r.width * mmProPx,
                    r.height * mmProPx
                );
            } catch (e) {
                // Bild konnte nicht eingebettet werden (z.B. CORS) -> ueberspringen
            }
        });
    }

    // Hyperlinks als klickbare Bereiche uebernehmen
    function zeichneLinks(pdf, element, basis, mmProPx) {
        element.querySelectorAll('a[href]').forEach(function (a) {
            const r = a.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return; // z.B. in zugeklappten Dropdowns
            pdf.link(
                (r.left - basis.left) * mmProPx,
                (r.top - basis.top) * mmProPx,
                r.width * mmProPx,
                r.height * mmProPx,
                { url: a.href }
            );
        });
    }

    // Oeffentliche Funktion: erwartet den .resume-container im pdf-mode
    window.erzeugeLebenslaufPdf = function (element) {
        return new Promise(function (resolve, reject) {
            try {
                // Blatt schrittweise verbreitern (= Inhalt herauszoomen), bis alles
                // auf EINE A4-Seite passt. Breiteres Layout -> kuerzere Texthoehe.
                let w = element.offsetWidth;
                element.style.setProperty('width', w + 'px', 'important');
                while (element.scrollHeight > w * A4_RATIO - 8 && w < 1250) {
                    w += 10;
                    element.style.setProperty('width', w + 'px', 'important');
                }

                const basis = element.getBoundingClientRect();
                const mmProPx = 210 / basis.width;

                const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                zeichneBoxen(pdf, element, basis, mmProPx);
                zeichneBilder(pdf, element, basis, mmProPx);
                zeichneText(pdf, element, basis, mmProPx);
                zeichneLinks(pdf, element, basis, mmProPx);

                element.style.removeProperty('width');
                resolve(pdf);
            } catch (err) {
                element.style.removeProperty('width');
                reject(err);
            }
        });
    };
})();
