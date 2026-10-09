import { createHash, randomUUID } from 'crypto';

import prisma from '../src/config/prisma';

import {
  BlobStatus,
  FileCategory,
  FileStatus,
  FolderStatus,
} from '../src/generated/prisma/enums';

import { Config } from '../src/config';

console.log('🔥 SEED FILE STARTED');

const USER_ID = Config.TEST_USER_ID;

if (!USER_ID) {
  throw new Error('TEST_USER_ID environment variable is required');
}

// ============================================================
// CONFIG
// ============================================================

const TOTAL_CHILD_FOLDERS = 3;
const TOTAL_FILES = 15;
const TOTAL_BLOBS = 5;

const FILE_BATCH_SIZE = 500;
const BLOB_BATCH_SIZE = 500;

const categories: FileCategory[] = [
  FileCategory.IMAGE,
  FileCategory.VIDEO,
  FileCategory.AUDIO,
  FileCategory.DOCUMENT,
  FileCategory.ARCHIVE,
];

const contentTypes = [
  'image/jpeg',
  'video/mp4',
  'audio/mpeg',
  'application/pdf',
  'application/zip',
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  // ============================================================
  // 1. CLEAN PREVIOUS TEST DATA
  // ============================================================

  console.log('🧹 Cleaning previous test data...');

  // Files reference blobs and folders.
  // Delete files first.
  const deletedFiles = await prisma.file.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  // Now blobs can be deleted safely.
  const deletedBlobs = await prisma.blob.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  // Finally folders.
  const deletedFolders = await prisma.folder.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  console.log(`Deleted ${deletedFiles.count} files`);
  console.log(`Deleted ${deletedBlobs.count} blobs`);
  console.log(`Deleted ${deletedFolders.count} folders`);

  // ============================================================
  // 2. CREATE MAIN FOLDER
  // ============================================================

  console.log('📁 Creating main folder...');

  const mainFolderId = randomUUID();

  await prisma.folder.create({
    data: {
      id: mainFolderId,
      userId: USER_ID,
      parentFolderId: null,
      name: 'Test Main Folder',
      status: FolderStatus.DELETING, // Start as DELETING to simulate a folder that is being processed
    },
  });

  console.log(`Created main folder: ${mainFolderId}`);

  // ============================================================
  // 3. CREATE CHILD FOLDERS
  // ============================================================

  console.log(
    `📁 Creating ${TOTAL_CHILD_FOLDERS} child folders...`,
  );

  const childFolders = Array.from(
    { length: TOTAL_CHILD_FOLDERS },
    (_, i) => ({
      id: randomUUID(),
      userId: USER_ID,
      parentFolderId: mainFolderId,
      name: `Test Folder ${i + 1}`,
      status: FolderStatus.ACTIVE,
    }),
  );

  await prisma.folder.createMany({
    data: childFolders,
  });

  console.log(
    `Created ${TOTAL_CHILD_FOLDERS} child folders`,
  );

  // ============================================================
  // 4. DEFINE BLOB REFERENCE DISTRIBUTION
  //
  // Blob 1 -> 3 files
  // Blob 2 -> 3 files
  // Blob 3 -> 3 files
  // Blob 4 -> 2 files
  // Blob 5 -> 4 files
  //
  // Total = 15 files
  // ============================================================

  const blobReferenceDistribution = [
    3,
    3,
    3,
    2,
    4,
  ];

  if (
    blobReferenceDistribution.length !==
    TOTAL_BLOBS
  ) {
    throw new Error(
      'Blob distribution does not match TOTAL_BLOBS',
    );
  }

  const totalReferences =
    blobReferenceDistribution.reduce(
      (sum, count) => sum + count,
      0,
    );

  if (totalReferences !== TOTAL_FILES) {
    throw new Error(
      `Blob distribution has ${totalReferences} references, expected ${TOTAL_FILES}`,
    );
  }

  // ============================================================
  // 5. CREATE BLOBS
  // ============================================================

  console.log(`🗄️ Creating ${TOTAL_BLOBS} blobs...`);

  const blobs = Array.from(
    { length: TOTAL_BLOBS },
    (_, i) => {
      const blobId = randomUUID();

      const categoryIndex =
        i % categories.length;

      const size = BigInt(
        1024 +
          Math.floor(
            Math.random() * 10 * 1024 * 1024,
          ),
      );

      const contentType =
        contentTypes[categoryIndex];

      const sha256 = createHash('sha256')
        .update(`test-blob-${blobId}`)
        .digest('hex');

      return {
        id: blobId,

        userId: USER_ID,

        s3KeyName:
          `test-seed/${USER_ID}/${blobId}`,

        size,

        contentType,

        refCount:
          blobReferenceDistribution[i],

        sha256,

        status: BlobStatus.ACTIVE,
      };
    },
  );

  // ============================================================
  // 6. INSERT BLOBS
  // ============================================================

  for (
    let i = 0;
    i < blobs.length;
    i += BLOB_BATCH_SIZE
  ) {
    const batch = blobs.slice(
      i,
      i + BLOB_BATCH_SIZE,
    );

    await prisma.blob.createMany({
      data: batch,
    });

    console.log(
      `Created blobs ${i + 1}-${Math.min(
        i + BLOB_BATCH_SIZE,
        blobs.length,
      )}`,
    );
  }

  // ============================================================
  // 7. CREATE FILES
  // ============================================================

  console.log(`📄 Creating ${TOTAL_FILES} files...`);

  const files = [];

  let currentBlobIndex = 0;
  let filesForCurrentBlob = 0;

  for (let i = 0; i < TOTAL_FILES; i++) {
    const blob = blobs[currentBlobIndex];

    const categoryIndex =
      i % categories.length;

    files.push({
      id: randomUUID(),

      userId: USER_ID,

      folderId: mainFolderId,

      blobId: blob.id,

      name: `test-file-${i + 1}`,

      size: blob.size,

      contentType: blob.contentType,

      category: categories[categoryIndex],

      status: FileStatus.ACTIVE,
    });

    filesForCurrentBlob++;

    // Move to next blob when its expected
    // reference count has been reached.
    if (
      filesForCurrentBlob >=
      blobReferenceDistribution[currentBlobIndex]
    ) {
      currentBlobIndex++;
      filesForCurrentBlob = 0;
    }
  }

  // ============================================================
  // 8. INSERT FILES
  // ============================================================

  for (
    let i = 0;
    i < files.length;
    i += FILE_BATCH_SIZE
  ) {
    const batch = files.slice(
      i,
      i + FILE_BATCH_SIZE,
    );

    await prisma.file.createMany({
      data: batch,
    });

    console.log(
      `Created files ${i + 1}-${Math.min(
        i + FILE_BATCH_SIZE,
        files.length,
      )}`,
    );
  }

  // ============================================================
  // 9. VERIFY BASIC COUNTS
  // ============================================================

  console.log('');
  console.log('====================================');
  console.log('🔍 SEED VERIFICATION');
  console.log('====================================');

  const childFolderCount =
    await prisma.folder.count({
      where: {
        userId: USER_ID,
        parentFolderId: mainFolderId,
      },
    });

  const mainFolderFileCount =
    await prisma.file.count({
      where: {
        userId: USER_ID,
        folderId: mainFolderId,
      },
    });

  const blobCount =
    await prisma.blob.count({
      where: {
        userId: USER_ID,
      },
    });

  console.log({
    mainFolderId,
    childFolderCount,
    mainFolderFileCount,
    blobCount,
  });

  // ============================================================
  // 10. VERIFY refCount
  // ============================================================

  console.log('');
  console.log('🔗 Verifying blob refCounts...');

  const blobVerification =
    await prisma.blob.findMany({
      where: {
        userId: USER_ID,
      },
      select: {
        id: true,
        s3KeyName: true,
        refCount: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

  for (const blob of blobVerification) {
    console.log({
      blobId: blob.id,
      s3KeyName: blob.s3KeyName,
      storedRefCount: blob.refCount,
      actualRefCount: blob._count.files,
    });

    if (
      blob.refCount !==
      blob._count.files
    ) {
      throw new Error(
        `refCount mismatch for blob ${blob.id}: ` +
          `stored=${blob.refCount}, ` +
          `actual=${blob._count.files}`,
      );
    }
  }

  console.log(
    '✅ All blob refCounts are correct',
  );

  // ============================================================
  // 11. VERIFY EXPECTED COUNTS
  // ============================================================

  if (
    childFolderCount !==
    TOTAL_CHILD_FOLDERS
  ) {
    throw new Error(
      `Expected ${TOTAL_CHILD_FOLDERS} child folders, got ${childFolderCount}`,
    );
  }

  if (
    mainFolderFileCount !==
    TOTAL_FILES
  ) {
    throw new Error(
      `Expected ${TOTAL_FILES} files, got ${mainFolderFileCount}`,
    );
  }

  if (
    blobCount !==
    TOTAL_BLOBS
  ) {
    throw new Error(
      `Expected ${TOTAL_BLOBS} blobs, got ${blobCount}`,
    );
  }

  // ============================================================
  // 12. DATABASE CONNECTION CHECK
  // ============================================================

  const result =
    await prisma.$queryRaw<
      {
        current_database: string;
        current_schema: string;
        inet_server_addr: string;
      }[]
    >`
      SELECT
        current_database(),
        current_schema(),
        inet_server_addr()::text;
    `;

  console.log('Connected DB:', result);

  // ============================================================
  // 13. FINAL SUMMARY
  // ============================================================

  console.log('');
  console.log('====================================');
  console.log('📊 FINAL SEED SUMMARY');
  console.log('====================================');

  console.log({
    mainFolderId,

    folders: {
      main: 1,
      children: childFolderCount,
      total: childFolderCount + 1,
    },

    files: mainFolderFileCount,

    blobs: blobCount,

    refCounts: blobVerification.map(
      (blob) => ({
        blobId: blob.id,
        refCount: blob.refCount,
      }),
    ),
  });

  console.log('');
  console.log('====================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('====================================');
}

// ============================================================
// RUN
// ============================================================

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });