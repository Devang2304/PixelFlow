import { Stack, StackProps, aws_s3 as S3,
    RemovalPolicy,
    CfnOutput,
    aws_lambda as lambda,
    Duration,
    aws_iam as iam,
    aws_logs as logs,
    aws_cloudfront as cloudFront,
    Fn,
    aws_cloudfront_origins as origins
 } from "aws-cdk-lib";
 import { CfnDistribution } from "aws-cdk-lib/aws-cloudfront";



 const S3BucketName = env.S3_BUCKET_NAME;
 const s3TransformBucketName = env.S3_TRANSFORM_BUCKET_NAME;

 const s3TransformedImageExpirationDuration = env.S3_TRANSFORMED_IMAGE_EXPIRATION_DURATION ?? '90';

 const s3TransformedImageCacheTTL = 'max-age=31536000';
 const maxImageSize = '1024000'
 
 const lambdaFunctionName = env.LAMBDA_FUNCTION_NAME;

 const lambdaMemory = '1500';
 const lambdaTimeout = '60';

 const imageDeliveryCacheBehaviorConfig = {
    origin: null,
    viewerProtocolPolicy: null,
    cachePolicy: null,
    functionAssociation: null,
    responseHeaderPolicy: null
 }

 export class ImageOptimisationStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const originalImageS3Bucket = new S3.Bucket(this, 'OriginalS3Bucket', {
         bucketName : S3BucketName,
         removalPolicy : RemovalPolicy.DESTROY,
         blockPublicAccess : S3.blockPublicAccess.BLOCK_ALL,
         encryption : S3.BucketEncryption.S3_MANAGED,
         enforceSSL : true,
         autoDeleteObjects : true,
        });

        new CfnOutput(this, 'OriginalS3BucketName', {
         description: 'Original image bucket',
         value: originalImageS3Bucket.bucketName
        })

        const transformedImageS3Bucket = new S3.Bucket(this, 'TransformedImageS3Bucket', {
         bucketName : s3TransformBucketName,
         removalPolicy : RemovalPolicy.DESTROY,
         blockPublicAccess : S3.blockPublicAccess.BLOCK_ALL,
         encryption : S3.BucketEncryption.S3_MANAGED,
         enforceSSL : true,
         autoDeleteObjects : true,
         lifecycleRules: [
            {
                expiration: Duration.days(
                    parseInt(s3TransformedImageExpirationDuration)
                )
            }
         ]
        });

        new CfnOutput(this, 'TransformedImageS3BucketName', {
         description: 'Transformed image bucket',
         value: transformedImageS3Bucket.bucketName
        })

        const lambdaCredentials = {
         originalImageBucketName: originalImageS3Bucket.bucketName,
         transformedImageBucketName: transformedImageS3Bucket.bucketName,
         transformedImageCacheTTL: s3TransformedImageCacheTTL,
         maxImageSize: maxImageSize
        }

        const imageTransformerLambda = new lambda.Function(
         this, 'ImageTransformerLambda', {
            functionName : lambdaFunctionName,
            runtime : lambda.Runtime.NODEJS_18_X,
            handler : 'index.handler',
            code : lambda.Code.fromAsset('lambda'),
            timeout : Duration.seconds(parseInt(lambdaTimeout)),
            memorySize : parseInt(lambdaMemory),
            environment: lambdaCredentials,
            logRetention : logs.RetentionDays.ONE_DAY,   
    });

    const imageTransformerLambdaFunctionURL = 
    imageTransformerLambda.addFunctionUrl();

    const imageTransformerLambdaFunctionDomainName = Fn.parseDomainName(
      imageTransformerLambdaFunctionURL.url
    );

    new CfnOutput(this, 'ImageTransformerLambdaFunctionName', {
      description: 'Image transformer lambda function name',
      value: imageTransformerLambda.functionName
    });

    const originalImageS3BucketGetObjectPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`arn:aws:s3:::${originalImageS3Bucket.bucketName}/*`]
    });

    const TransformedImageS3BucketPutObjectPolicy = new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`arn:aws:s3:::${transformedImageS3Bucket.bucketName}/*`]
    });

    imageTransformerLambda.role?.attachInlinePolicy(
      new iam.Policy(this, 'ReadOriginalPutTransformedBucketPolicy',{
         statements: [
            originalImageS3BucketGetObjectPolicy,
            TransformedImageS3BucketPutObjectPolicy
         ]
      })
    )

    const s3ImageOriginGroup = new origins.OriginGroup({
      primaryOrigin: new origins.S3Origin(originalImageS3Bucket),
      fallbackOrigin: new origins.HttpOrigin(
         imageTransformerLambdaFunctionDomainName
      ),
      fallbackStatusCodes: [403,500,503,504],
    });

    const urlRewriteCloudfrontFunction = new cloudFront.Function(
      this, 'UrlRewriteCloudfrontFunction', {
         code: cloudFront.FunctionCode.fromAsset('functions/cloudFront/url-rewrite.js'),
         functionName: 'UrlRewriteCloudfrontFunction',
      }
    );

    const imageDeliveryCacheBehaviorConfig = {
      origin: s3ImageOriginGroup,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudFront.CachePolicy({
         defaultTtl: Duration.hours(24),
         maxTtl: Duration.days(365),
         minTtl: Duration.minutes(0),
         queryStringBehavior: cloudFront.CacheQueryStringBehavior.all()
      }),
      functionAssociations: [
         {
            function: urlRewriteCloudfrontFunction,
            eventType: cloudFront.FunctionEventType.VIEWER_REQUEST
         }
      ],

      responseHeaderPolicy: new cloudFront.ResponseHeaderPolicy(
         this, 'ImageDeliveryResponseHeaderPolicy', {
            responseHeaderPolicyName: 'ImageDeliveryResponseHeaderPolicy',
            corsBehavior: {
               accessControlAllowCredentials: false,
               accessControlAllowHeaders: ['*'],
               accessControlAllowMethods: ['GET'],
               accessControlAllowOrigins: ['*'],
               accessControlMaxAge: Duration.days(600),
               originOverride: false
            },
         }
      )
   }

   const imageDeliveryCloudFrontDistribution = new cloudFront.Distribution(
      this, 'ImageDeliveryCloudFront', {
         defaultBehavior: imageDeliveryCacheBehaviorConfig,
      }
   );


   const oac = new cloudFront.OriginAccessControl(
      this, 'OAC', {
         name: 'OAC',
         originAccessControlOriginType: 'lambda',
         signingBehavior: 'always',
         signingProtocol: 'sigv4'
      }
   );

   imageDeliveryCloudFrontDistribution.addOriginAccessControl(oac);

   const imageDeliveryCloudFrontDistributionDomainName = 
   imageDeliveryCloudFrontDistribution.domainName;

   new CfnOutput(this, 'ImageDeliveryCloudFrontDistributionDomainName', {
      description: 'Image delivery cloudfront distribution domain name',   
      value: imageDeliveryCloudFrontDistributionDomainName
   })

   const imageDeliveryCloudFrontDistributionId = 
   imageDeliveryCloudFrontDistribution.distributionId;

   new CfnOutput(this, 'ImageDeliveryCloudFrontDistributionId', {
      description: 'Image delivery cloudfront distribution id',
      value: imageDeliveryCloudFrontDistributionId
   })
   
}
 }
