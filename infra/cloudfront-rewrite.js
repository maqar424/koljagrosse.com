// CloudFront Function (viewer-request) — Clean URLs für ein statisches S3-Setup.
//
//   /                    -> 302-Redirect auf /lebenslauf/ (Startseite ist ausgeblendet,
//                           bleibt aber unter /index.html erreichbar)
//   /lebenslauf/         -> /lebenslauf/index.html
//   /aviation            -> /aviation.html
//   /datasolut_bewerbung -> /lebenslauf/datasolut_anschreiben.html (Anschreiben,
//                           liegt im Lebenslauf-Ordner wegen gemeinsamer Assets)
//   /css/style.css       -> unverändert (hat bereits eine Endung)
//
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Nur der Lebenslauf wird angezeigt: Root leitet direkt dorthin um.
  // 302 statt 301, damit Browser die Umleitung nicht dauerhaft cachen.
  if (uri === '/') {
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: {
        location: { value: '/lebenslauf/' }
      }
    };
  }

  // Anschreiben für datasolut: hübsche URL auf die Datei im Lebenslauf-Ordner
  // abbilden (dort liegen style.css, pdf.js und die Assets, die die Seite nutzt).
  if (uri === '/datasolut_bewerbung' || uri === '/datasolut_bewerbung/') {
    request.uri = '/lebenslauf/datasolut_anschreiben.html';
    return request;
  }

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '.html';
  }

  return request;
}
