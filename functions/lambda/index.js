const sharp = require('sharp');
const {S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand} = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
dotenv.config();
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

    const s3client = new S3Client({
        region : process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    
    const { fileName,imageUrl,folderName } = event.queryStringParameters;
    let data;
    try {
            if (!folderName || !imageUrl) {
                throw new Error('folderName and file name are required');
            }
            fileName = encodeURIComponent(fileName);
            const command = new GetObjectCommand({
                    Bucket: process.env.ORIGINAL_IMAGE_CDN,
                    Key: `${folderName}/${fileName}`
                });
                 data = await s3client.send(command);
        } catch (error) {
            console.error(error);
        }
    const chunks = [];
    for await(const chunk of data.Body) {
        chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);

    const urlObj = new URL(imageUrl);
    let newFileName = urlObj.pathname.split("/").pop();
    const params = new URLSearchParams(urlObj.search);
    const queryParams = urlObj.search;
    newFileName = queryParams ? `${newFileName}${queryParams}`: newFileName;

    let w = parseInt(params.get("w") || 0);
    let h = parseInt(params.get("h") || 0);
    let q = parseInt(params.get("q") || 50);

    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        const { format } = metadata;
        if (w && !h) h = w;
        if (h && !w) w = h;

        let pipeline = image.resize(w, h, {
            fit: 'inside',    
            withoutEnlargement: true  
          });
        pipeline = pipeline.toFormat(format);
        if (['jpeg', 'png', 'jpg', 'webp', 'gif'].includes(format.toLowerCase())) {
            pipeline = pipeline.jpeg({ quality: q })
                .gif({ quality: q })
                .png({ quality: q })
                .webp({ quality: q })
        }
        pipeline = pipeline.toBuffer();
        
        const resizedImage = await pipeline;
        newFileName=encodeURIComponent(newFileName);
        const resizedImageKey = `${folderName}/${newFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.TRANSFORMED_IMAGE_CDN,
            Key: resizedImageKey,
            Body: resizedImage,
            ContentType: `image/${format}`
        });
        await s3client.send(command);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': `image/${format}`,
            },
            body: resizedImage.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
};



// testing code
handler({
    queryStringParameters: {
        fileName: 'ironman.jpg',
        imageUrl: 'https://my-cdn.com/DEVANG/ironman.jpg?w=400&h=400&q=50',
        folderName: 'DEVANG'
    }
}).then((result) => {
    console.log(result);
}).catch((error) => {
    console.error(error);
});


module.exports = { handler };