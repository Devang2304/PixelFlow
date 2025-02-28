// wrong [different clouudfront function strucutre]
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html

// actual event structure that cloudfront sends
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html

const handler = (event) => {
  var request = event.request;
  var { uri, querystring } = request;
  var url = `${uri}?${querystring}`;
  try {
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

    var w = parseInt(querystring.split("w=")[1].split("&")[0] || 0);
    var h = parseInt(querystring.split("h=")[1].split("&")[0] || 0);
    var q = parseInt(querystring.split("q=")[1].split("&")[0] || 75);

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
    request.querystring = "";
    return request;
  } catch (error) {
    console.error("URL normalization failed:", error.message);
    return null;
  }
};


const event = {
  "request": {
      "method": "GET",
      "uri": "/DEVANG/ironman.jpg",
      "querystring": "w=259&h=259&q=50",
      "headers": {},
      "cookies": {}
  }
}

console.log(handler(event));


// {
//   "version": "1.0",
//   "context": {
//       "eventType": "viewer-request"
//   },
//   "viewer": {
//       "ip": "1.2.3.4"
//   },
//   "request": {
//       "method": "GET",
//       "uri": "/DEVANG/ironman.jpg",
//       "querystring": "w=259&h=259&q=50",
//       "headers": {},
//       "cookies": {}
//   }
// }