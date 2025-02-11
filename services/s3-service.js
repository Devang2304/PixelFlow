const {S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3client = new S3Client({
    region : process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});


const uploadImageToAWS = async (bucketName,imageStream, fileName, ContentType) => {
    if (!bucketName || !imageStream || !fileName) {
        throw new Error('Missing required parameters');
    }
    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: imageStream,
            ContentType: ContentType
        });
        await s3client.send(command);
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
};

const extractFileName = (url) => {
    const url = new URL(imageUrl);
        const basePath = url.pathname.split("/").pop();
        const queryParams = url.search;
        const fileName = queryParams ? `${basePath}${queryParams}`: basePath;
        return fileName
}

const handleS3Error = (error) => {
    console.error(error);
    if (error.name === 'NotFound'){
        console.error('S3 resource not found');
        return false;
    }
    if (error.name === 'Forbidden') {
        console.error('Access denied to S3 resource');
        return false;
    }
    throw error; 
};

const isFileExistInAws = async (bucketName, imageUrl) => {
    try {
        const fileName = extractFileName(imageUrl);
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: fileName
        })
        await s3client.send(command);
        return true;
    } catch (error) {
        return handleS3Error(error);
    }
}

const getFileUrlFromAws = async (bucketName,imageUrl) => {
    try {
        const fileName = extractFileName(imageUrl);  // need changes here cant send dir/, only need to send filename and query params
        const check = await isFileExistInAws(bucketName, fileName);

        if(check) {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: fileName
            });
            const singedUrl = await getSignedUrl(s3client, command);
            return singedUrl;
        } else {
            console.error("File not found");
            return "File not found";
        }
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
}

const getFileFromAws = async (bucketName, imageUrl) => {
    try {
        if (!bucketName || !imageUrl) {
            throw new Error('Bucket name and file name are required');
        }
        const fileName = extractFileName(imageUrl);
        const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: fileName
            });
            const data = await s3client.send(command);
            return data;
    } catch (error) {
        return handleS3Error(error);
    }
}


module.exports = {
    uploadImageToAWS,
    isFileExistInAws,
    getFileFromAws,
    getFileUrlFromAws
}


