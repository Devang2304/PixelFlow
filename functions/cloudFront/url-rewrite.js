
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html

// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html

async function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var querystring =request.querystring;
  var url = `${uri}?${querystring}`;

if (!url || typeof url !== "string") {
  throw new Error("Invalid URL input");
}

var filename = url.split("/").pop().split("?")[0];
var folderName = url.split("/").slice(1, -1).join("/");

var extension = filename.split(".").pop().toLowerCase().split("?")[0];
var supportedExtensions = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

if (!supportedExtensions.includes(extension)) {
  throw new Error("Unsupported image format");
}

var w = parseInt(querystring.w ? querystring.w.value : "0");
var h = parseInt(querystring.h ? querystring.h.value : "0");
var q = parseInt(querystring.q ? querystring.q.value : "75");

w = Math.max(0, Math.min(w, 10000));
h = Math.max(0, Math.min(h, 10000));

q = Math.max(0, Math.min(q, 100));

if (w && !h) h = w;
if (h && !w) w = h;

var normalisedUrl;
var urlComponent;
if (!w && !h) {
  urlComponent = `?q=${q}`;
} else {
  urlComponent = `?w=${w}&h=${h}&q=${q}`;
}
urlComponent = encodeURIComponent(urlComponent);
normalisedUrl = `/${folderName}/${filename}${urlComponent}`;
request.uri = normalisedUrl;
request.querystring = {};
return request;
}

const event = {
  "version": "1.0",
  "context": {
    "eventType": "viewer-request"
  },
  "viewer": {
    "ip": "1.2.3.4"
  },
  "request": {
    "method": "GET",
    "uri": "/DEVANG/ironman.jpg",
    "headers": {},
    "cookies": {},
    "querystring": {
      "w": {
        "value": "259"
      },
      "h": {
        "value": "259"
      },
      "q": {
        "value": "50"
      }
    }
  }
}

console.log(handler(event));


