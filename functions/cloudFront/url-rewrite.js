const {S3Client, HeadObjectCommand} = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();

// wrong [different clouudfront function strucutre]
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html 


// actual event structure that cloudfront sends 
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html


const s3client = new S3Client({
  region : process.env.AWS_REGION,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const checkIfImageExists = async (url) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.TRANSFORMED_IMAGE_CDN,
      Key: url
    })
    await s3client.send(command);
    return true;
  } catch (error) {

    if (error.name === 'NotFound') {
      console.log("not found");
      return false; 
    }
    throw error; 
  
  }
}

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  let { uri, querystring } = request;
  const url = `${uri}?${querystring}`;
    try {
        if (!url || typeof url !== "string") {
          throw new Error("Invalid URL input");
        }
    
        
    
        const filename = url.split("/").pop().split("?")[0];
        const folderName = url.split("/").slice(1, -1).join("/");

        const extension = filename.split(".").pop().toLowerCase().split("?")[0];
        const supportedExtensions = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
        
        if (!supportedExtensions.includes(extension)) {
          throw new Error("Unsupported image format");
        }

        let w = parseInt(querystring.split("w=")[1].split("&")[0] || 0);
        let h = parseInt(querystring.split("h=")[1].split("&")[0] || 0);
        let q = parseInt(querystring.split("q=")[1].split("&")[0] || 75);
    
        // let w = parseInt(querystring.get("w") || 0);
        // let h = parseInt(querystring.get("h") || 0);
        // let q = parseInt(querystring.get("q") || 75);
    
        w = Math.max(0, Math.min(w, 10000));
        h = Math.max(0, Math.min(h, 10000));
    
        q = Math.max(0, Math.min(q, 100));
    
        if (w && !h) h = w;
        if (h && !w) w = h;

        var normalisedUrl;
        var urlComponent;
        let imageExists;
        if (!w && !h) {
          urlComponent =`?q=${q}`;
          imageExists = await checkIfImageExists(`${folderName}/${filename}${urlComponent}`);
        } else {
          urlComponent =`?w=${w}&h=${h}&q=${q}`;
          imageExists = await checkIfImageExists(`${folderName}/${filename}${urlComponent}`);
        }
        if (imageExists) {
          urlComponent=encodeURIComponent(urlComponent);
          normalisedUrl = `/${folderName}/${filename}${urlComponent}`;
          request.uri = normalisedUrl;
          request.querystring = '';
          return request;
        } else {
          // const request = 
          // return ;
        }
      } catch (error) {
        console.error("URL normalization failed:", error.message);
        return null;
      }
  };

  // test code
  const event = {
    Records: [
      {
        cf: {
          request: {
            uri: '/DEVANG/ironman.jpg',
            querystring: 'w=259&h=259&q=50',
          },
        },
      },
    ],
  };
  

  exports.handler(event).then((result) => {
    console.log(result);
  });