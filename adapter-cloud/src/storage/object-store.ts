import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

const BUCKET = process.env.S3_REPORTS_BUCKET ?? 'production-master-reports';

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

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
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
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
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
