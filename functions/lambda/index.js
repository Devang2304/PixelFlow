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
            const command = new GetObjectCommand({
                    Bucket: process.env.ORIGINAL_IMAGE_CDN,
                    Key: `${folderName}/${fileName}`
                });
                 data = await s3client.send(command);
        } catch (error) {
            console.error(error);
        }

    const urlObj = new URL(imageUrl);
    let newFileName = urlObj.pathname.split("/").pop();
    const params = new URLSearchParams(urlObj.search);
    const queryParams = urlObj.search;
    newFileName = queryParams ? `${newFileName}${queryParams}`: newFileName;

    let w = parseInt(params.get("w") || 0);
    let h = parseInt(params.get("h") || 0);
    let q = parseInt(params.get("q") || 50);

    try {
        const file = data.Body;
        const image = sharp(file);
        const metadata = await image.metadata();

        const { format } = metadata;
        if (w && !h) h = w;
        if (h && !w) w = h;
        const resizedImage = await image.resize(w,h).toFormat(format).quality(q).toBuffer();
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


module.exports = { handler };