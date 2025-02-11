const AWS = require("aws-sdk");

const lambda = new AWS.Lambda({
  region: "us-east-1", 
});

const functionName = "myLambdaFunction"; 

const lambdaParams = {
  FunctionName: functionName,
  Runtime: "nodejs18.x",
  Role: "arn:aws:iam::123456789012:role/lambda-role", 
  Handler: "index.handler",
  Code: {
    S3Bucket: "my-lambda-bucket", 
    S3Key: "lambda-code.zip", 
  },
  Timeout: 10,
  MemorySize: 128,
  Environment: {
    Variables: {
      MY_ENV_VAR: "some_value",
    },
  },
};

lambda.createFunction(lambdaParams, function (err, data) {
  if (err) console.error("Error creating Lambda function:", err);
  else console.log("Lambda function created successfully:", data);
});
