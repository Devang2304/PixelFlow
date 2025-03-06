const sharp = require('sharp');
const { S3 } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();

const s3 = new S3({ 
    endpoint: `https://s3.ap-south-1.amazonaws.com`,
    region: 'ap-south-1'
});

// JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG images are supported
// operations to be added once basic functionality is working :
// 1. Cropping
// 2. rotate / flip
// 3. Overlay/Watermark
// 4. Blur/Sharpen
// 5. Tint/Grayscale
// 6. Add Borders/Padding
// 7. Gamma Correction
// 8. Negate
// 9. Custom Pipelines



const handler = async (event) => {
    
    let record =event.Records[0].cf;
    let request = record.request;
    let uri = request.uri;

        const parts = uri.split("/");
        if(parts.length < 2){
            console.log("Invalid URL");
            return {
                statusCode: 404,
                body: "Invalid URL"
            }
        }
        const folderName = parts[1];
        const encodedFileName = parts[parts.length - 1];
        const decodedFileName = decodeURIComponent(encodedFileName);

        const [fileName, queryString] = decodedFileName.split('?');

    let data;
    try {
            if (!folderName || !fileName) {
                throw new Error('folderName and file name are required');
            }
            const params = {
                Bucket: process.env.ORIGINAL_IMAGE_CDN,
                Key: `${folderName}/${fileName}`
            };
            data = await s3.getObject(params);
        } catch (error) {
            if (error.statusCode === 404) {
                return {
                    statusCode: 404,
                    body: 'Image not found'
                };
            }
            console.error(error);
        }

    const chunks = [];
    for await(const chunk of data.Body) {
        chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);

    let queryParams = {};
    queryParams = queryString.split('&').reduce((params, param) => {
        const [key, value] = param.split('=');
        params[key] = value;
        return params;
    }, {});

    let newFileName = queryString ? `${fileName}?${queryString}`: fileName;

    let w = parseInt(queryParams.w || 0);
    let h = parseInt(queryParams.h || 0);
    let q = parseInt(queryParams.q || 50);


    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        const { format } = metadata;
        if (w && !h) h = w;
        if (h && !w) w = h;

        let pipeline;
        if(w && h){
            pipeline = image.resize(w, h, {
                fit: 'inside',    
                withoutEnlargement: true  
              });
              pipeline = pipeline.toFormat(format);   
        }else{
            pipeline = image;
        }
        if (['jpeg', 'png', 'jpg', 'webp', 'gif'].includes(format.toLowerCase())) {
            pipeline = pipeline.jpeg({ quality: q })
                .gif({ quality: q })
                .png({ quality: q })
                .webp({ quality: q })
        }
        pipeline = pipeline.toBuffer();
        
        const resizedImage = await pipeline;
        const resizedImageKey = `${folderName}/${newFileName}`;

        const uploadParams ={
            Bucket: process.env.TRANSFORMED_IMAGE_CDN,
            Key: resizedImageKey,
            Body: resizedImage,
            ContentType: `image/${format}`
        };
        const uploadResult = await s3.putObject(uploadParams);
        if (!uploadResult) {
            throw new Error('Failed to upload resized image to S3');
        }

        return {
            "status": "302",
            "statusDescription": "Found",
            "headers": {
              "location": [{
                "key": "Location",
                "value": `https://${process.env.TRANSFORMED_IMAGE_CDN_URL}/${resizedImageKey}`
              }]
            }
          };
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
};




module.exports = { handler };