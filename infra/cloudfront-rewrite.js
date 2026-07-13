// CloudFront Function (viewer-request) — Clean URLs für ein statisches S3-Setup.
//
//   /                -> /index.html
//   /lebenslauf      -> /lebenslauf.html
//   /projekte/       -> /projekte/index.html
//   /css/style.css   -> unverändert (hat bereits eine Endung)
//
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '.html';
  }

  return request;
}
