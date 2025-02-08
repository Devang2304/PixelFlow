const normalisedUrl = (url) => {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL input");
    }

    const urlObj = new URL(url);
    console.log(urlObj);

    const filename = urlObj.pathname.split("/").pop();
    const extension = filename.split(".").pop().toLowerCase();

    const supportedExtensions = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
    if (!supportedExtensions.includes(extension)) {
      throw new Error("Unsupported image format");
    }

    const params = new URLSearchParams(urlObj.search);

    let w = parseInt(params.get("w") || 0);
    let h = parseInt(params.get("h") || 0);
    let q = parseInt(params.get("q") || 75);

    w = Math.max(0, Math.min(w, 10000));
    h = Math.max(0, Math.min(h, 10000));

    q = Math.max(0, Math.min(q, 100));

    if (w && !h) h = w;
    if (h && !w) w = h;

    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    if (!w && !h) {
      return `${baseUrl}?q=${q}`;
    }

    return `${baseUrl}?w=${w}&h=${h}&q=${q}`;
  } catch (error) {
    console.error("URL normalization failed:", error.message);
    return null;
  }
};

console.log(
  normalisedUrl(
    "https://my-cdn.com/image.png?h=34.66"
  )
);
