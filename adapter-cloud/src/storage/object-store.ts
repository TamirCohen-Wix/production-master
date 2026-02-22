import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getAwsConfig } from '../config/wix-config.js';

let _s3: S3Client | undefined;
let _bucket: string | undefined;

function getS3(): S3Client {
  if (!_s3) {
    const awsConfig = getAwsConfig();
    _s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      ...(awsConfig.accessKeyId && {
        credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
        },
      }),
    });
    _bucket = awsConfig.bucket;
  }
  return _s3;
}

function getBucket(): string {
  if (!_bucket) {
    getS3(); // initializes _bucket as side effect
  }
  return _bucket!;
}

/**
 * Upload an investigation report to S3.
 * Returns the S3 object key.
 */
export async function uploadReport(
  investigationId: string,
  content: string,
  contentType = 'text/html',
): Promise<string> {
  const key = `reports/${investigationId}/report.html`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: content,
      ContentType: contentType,
    }),
  );

  return key;
}

/**
 * Retrieve an investigation report from S3.
 * Returns the report body as a string.
 */
export async function getReport(investigationId: string): Promise<string | null> {
  const key = `reports/${investigationId}/report.html`;

  try {
    const response = await getS3().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
      }),
    );

    return (await response.Body?.transformToString()) ?? null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NoSuchKey') {
      return null;
    }
    throw err;
  }
}
