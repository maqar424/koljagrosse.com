// CloudFront Function (viewer-request) — Clean URLs für ein statisches S3-Setup.
//
//   /                -> 302-Redirect auf /lebenslauf/ (Startseite ist ausgeblendet,
//                       bleibt aber unter /index.html erreichbar)
//   /lebenslauf/     -> /lebenslauf/index.html
//   /aviation        -> /aviation.html
//   /css/style.css   -> unverändert (hat bereits eine Endung)
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

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '.html';
  }

  return request;
}
