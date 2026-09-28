


// scripts/abort-stuck-uploads.ts
import {
  S3Client,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from '../../config/s3';
import prisma from '../../config/prisma';
import { FileStatus, UploadStatus } from '../../generated/prisma/browser';
import { Config } from '../../config';


const BUCKET_NAME = Config.aws.bucketName; // Replace with your S3 bucket name

interface StuckFile {
  id: string;
  s3KeyName: string;
  fileUpload: {
    id: string;
    s3UploadId: string;
  } | null;
}

async function main() {
  const stuckFiles: StuckFile[] = await prisma.file.findMany({
    where: {
      status: FileStatus.IN_PROGRESS,
      fileUpload: {
        status: UploadStatus.PENDING,
      },
    },
    select: {
      id: true,
      s3KeyName: true,
      fileUpload: {
        select: {
          id: true,
          s3UploadId: true,
        },
      },
    },
  });

  console.log(`Found ${stuckFiles.length} stuck file(s) to clean up.`);

  const succeeded: string[] = [];
  const failed: { fileId: string; error: string }[] = [];

  for (const file of stuckFiles) {
    if (!file.fileUpload) continue; // safety guard, shouldn't happen given the filter

    try {
      // 1. Abort the multipart upload on S3
      await s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: BUCKET_NAME,
          Key: file.s3KeyName,
          UploadId: file.fileUpload.s3UploadId,
        }),
      );

      // 2. Delete the File row (cascades to FileUpload via onDelete: Cascade)
      await prisma.file.delete({
        where: { id: file.id },
      });

      succeeded.push(file.id);
      console.log(`Aborted + deleted file ${file.id}`);
    } catch (err: any) {
      // NoSuchUpload just means S3 already expired/cleared it — treat as OK to delete
      if (err?.name === 'NoSuchUpload') {
        try {
          await prisma.file.delete({ where: { id: file.id } });
          succeeded.push(file.id);
          console.log(`Upload already gone on S3, deleted DB record for ${file.id}`);
          continue;``
        } catch (deleteErr: any) {
          failed.push({ fileId: file.id, error: deleteErr.message });
          continue;
        }
      }

      failed.push({ fileId: file.id, error: err.message ?? String(err) });
      console.error(`Failed on file ${file.id}:`, err.message ?? err);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    console.table(failed);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
  });