// Test der quoted-printable Dekodierung für finAPI Newsletter
const testQuotedPrintable = str => {
  try {
    // Quoted-Printable Dekodierung implementieren
    return (
      str
        // Soft line breaks entfernen (= am Zeilende)
        .replace(/=\r?\n/g, '')
        .replace(/=\n/g, '')
        // Hex-kodierte Zeichen dekodieren
        .replace(/=([0-9A-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        })
        // Spezifische UTF-8 Sequenzen für deutsche Zeichen
        .replace(/=C3=A4/g, 'ä') // ä
        .replace(/=C3=B6/g, 'ö') // ö
        .replace(/=C3=BC/g, 'ü') // ü
        .replace(/=C3=84/g, 'Ä') // Ä
        .replace(/=C3=96/g, 'Ö') // Ö
        .replace(/=C3=9C/g, 'Ü') // Ü
        .replace(/=C3=9F/g, 'ß') // ß
        .replace(/=C2=A0/g, ' ') // Non-breaking space
        .replace(/=E2=80=93/g, '–') // En dash
        .replace(/=E2=80=94/g, '—') // Em dash
        .replace(/=E2=80=9C/g, '"') // Left double quotation
        .replace(/=E2=80=9D/g, '"') // Right double quotation
        .replace(/=E2=80=9E/g, '„') // Double low-9 quotation
        .replace(/=E2=80=99/g, "'") // Right single quotation
        .replace(/=E2=9C=85/g, '✅') // Check mark
        .replace(/=E2=9A=A0/g, '⚠') // Warning sign
        .replace(/=E2=9D=8C/g, '❌') // Cross mark
        .replace(/=EF=B8=8F/g, '️') // Variation selector
        // Weitere häufige Zeichen
        .replace(/=C2=B7/g, '·') // Middle dot
        .replace(/=E2=82=AC/g, '€') // Euro symbol
        .replace(/=C2=AE/g, '®') // Registered trademark
        .replace(/=C2=A9/g, '©') // Copyright
        .replace(/=C2=B0/g, '°') // Degree symbol
        // 3D Ersetzungen für HTML
        .replace(/=3D/g, '=')
    );
  } catch (error) {
    console.error('Quoted-Printable decoding failed:', error);
    return str;
  }
};

// Test mit finAPI Newsletter Beispiel
const testText = `**VoP-Service von finAPI f=C3=BCr Banken und TPPs**

Ab dem 9. Oktober 2025 wird die Empf=C3=A4nger=C3=BCberpr=C3=BCfung (Verifi=
cation of Payee, kurz VoP) bei SEPA-=C3=9Cberweisungen verpflichtend. Ziel =
ist es, =C3=9Cberweisungen sicherer zu machen, Fehl=C3=BCberweisungen zu ve=
rmeiden und Betrugsversuche zu reduzieren.

Mit dem VoP-Service von finAPI erf=C3=BCllen Banken und Zahlungsdienstleist=
er diese Anforderungen zuverl=C3=A4ssig und effizient. Die L=C3=B6sung erm=
=C3=B6glicht einen sicheren IBAN-Namensabgleich, ist schnell implementierba=
r und sorgt f=C3=BCr vollst=C3=A4ndige regulatorische Konformit=C3=A4t.

Adams-Lehmann-Stra=C3=9Fe 44, 80797 M=C3=BCnchen`;

console.log('ORIGINAL (unlesbar):');
console.log(testText);
console.log('\n' + '='.repeat(80) + '\n');
console.log('DECODED (lesbar):');
console.log(testQuotedPrintable(testText));
