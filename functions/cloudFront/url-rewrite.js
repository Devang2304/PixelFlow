exports.handler = async (event) => {
    let { url } = event.data;
    try {
        if (!url || typeof url !== "string") {
          throw new Error("Invalid URL input");
        }
    
        const urlObj = new URL(url);
        console.log(urlObj);
    
        const filename = urlObj.pathname.split("/").pop();
        const folderName = urlObj.pathname.split("/").slice(1, -1).join("/");
        console.log("filename", filename);
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
    
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        var normalisedUrl;
        var urlComponent;
        if (!w && !h) {
          urlComponent =`${filename}?q=${q}`;
          urlComponent=encodeURIComponent(urlComponent);
          normalisedUrl = `${baseUrl}/${folderName}/${urlComponent}`
          return normalisedUrl;
        }
        urlComponent =`${filename}?w=${w}&h=${h}&q=${q}`;
        urlComponent=encodeURIComponent(urlComponent);
        normalisedUrl = `${baseUrl}/${folderName}/${urlComponent}`;
        return normalisedUrl;
      } catch (error) {
        console.error("URL normalization failed:", error.message);
        return null;
      }
  };

  // test code
  const event = {
    data: {
      url: "https://cdn.com/DEVANG/System Architecture.png?w=1000&h=1000&q=50",
    },
  };

  exports.handler(event).then((result) => {
    console.log(result);
  });