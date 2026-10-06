import { createHash, randomUUID } from 'crypto';

import prisma from '../src/config/prisma';

import {
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

const TOTAL_CHILD_FOLDERS = 2500;
const TOTAL_FILES = 50000;

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

async function main() {
  // ============================================================
  // 1. CLEAN PREVIOUS TEST DATA
  // ============================================================

  console.log('🧹 Cleaning previous test data...');

  // Blobs reference files, so delete blobs first.
  const deletedBlobs = await prisma.blobs.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  // Files reference folders.
  const deletedFiles = await prisma.file.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  // Finally delete folders.
  const deletedFolders = await prisma.folder.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  console.log(`Deleted ${deletedBlobs.count} blobs`);
  console.log(`Deleted ${deletedFiles.count} files`);
  console.log(`Deleted ${deletedFolders.count} folders`);

  // ============================================================
  // 2. CREATE ONE MAIN ROOT FOLDER
  // ============================================================

  console.log('📁 Creating main folder...');

  // const mainFolderId = randomUUID();

  // await prisma.folder.create({
  //   data: {
  //     id: mainFolderId,
  //     userId: USER_ID,
  //     parentFolderId: null,
  //     name: 'Test Main Folder',
  //     status: FolderStatus.ACTIVE,
  //   },
  // });

  // console.log(`Created main folder: ${mainFolderId}`);

  // // ============================================================
  // // 3. CREATE 500 CHILD FOLDERS
  // // ============================================================

  // console.log(`📁 Creating ${TOTAL_CHILD_FOLDERS} child folders...`);

  // const childFolders = [];

  // for (let i = 0; i < TOTAL_CHILD_FOLDERS; i++) {
  //   childFolders.push({
  //     id: randomUUID(),
  //     userId: USER_ID,
  //     parentFolderId: mainFolderId,
  //     name: `Test Folder ${i + 1}`,
  //     status: FolderStatus.ACTIVE,
  //   });
  // }

  // await prisma.folder.createMany({
  //   data: childFolders,
  // });

  // console.log(
  //   `✅ Created ${TOTAL_CHILD_FOLDERS} child folders inside main folder`,
  // );

  // // ============================================================
  // // 4. CREATE 1000 FILES
  // //
  // // ALL FILES DIRECTLY BELONG TO THE MAIN FOLDER
  // // ============================================================

  // console.log(`📄 Creating ${TOTAL_FILES} files...`);

  // const files = [];

  // for (let i = 0; i < TOTAL_FILES; i++) {
  //   const categoryIndex = i % categories.length;

  //   files.push({
  //     id: randomUUID(),
  //     folderId: mainFolderId,
  //     userId: USER_ID,
  //     name: `test-file-${i + 1}`,
  //     size: BigInt(
  //       1024 + Math.floor(Math.random() * 10 * 1024 * 1024),
  //     ),
  //     contentType: contentTypes[categoryIndex],
  //     category: categories[categoryIndex],
  //     status: FileStatus.ACTIVE,
  //   });
  // }

  // // ============================================================
  // // 5. INSERT FILES IN BATCHES OF 500
  // // ============================================================

  // const FILE_BATCH_SIZE = 500;

  // for (let i = 0; i < files.length; i += FILE_BATCH_SIZE) {
  //   const batch = files.slice(i, i + FILE_BATCH_SIZE);

  //   await prisma.file.createMany({
  //     data: batch,
  //   });

  //   console.log(
  //     `Created files ${i + 1}-${Math.min(
  //       i + FILE_BATCH_SIZE,
  //       files.length,
  //     )}`,
  //   );
  // }

  // // ============================================================
  // // 6. CREATE BLOBS
  // //
  // // 100  -> refCount = 3
  // // 200  -> refCount = 2
  // // 700  -> refCount = 1
  // // ============================================================

  // console.log(`🗄️ Creating ${TOTAL_FILES} blobs...`);

  // const blobs = [];

  // for (let i = 0; i < files.length; i++) {
  //   const file = files[i];

  //   let refCount: number;

  //   if (i < 10000) {
  //     // First 100 files
  //     refCount = 3;
  //   } else if (i < 30000) {
  //     // Next 200 files
  //     refCount = 2;
  //   } else {
  //     // Remaining 700 files
  //     refCount = 1;
  //   }

  //   // Generate a deterministic unique SHA-256 for the test blob.
  //   const sha256 = createHash('sha256')
  //     .update(`test-blob-${file.id}`)
  //     .digest('hex');

  //   blobs.push({
  //     id: randomUUID(),

  //     // One blob belongs to exactly one file.
  //     fileId: file.id,

  //     s3KeyName: `test-seed/${USER_ID}/${file.id}`,

  //     size: file.size,

  //     contentType: file.contentType,

  //     refCount,

  //     sha256,

  //     userId: USER_ID,
  //   });
  // }

  // // Insert blobs in batches as well.
  // const BLOB_BATCH_SIZE = 500;

  // for (let i = 0; i < blobs.length; i += BLOB_BATCH_SIZE) {
  //   const batch = blobs.slice(i, i + BLOB_BATCH_SIZE);

  //   await prisma.blobs.createMany({
  //     data: batch,
  //   });

  //   console.log(
  //     `Created blobs ${i + 1}-${Math.min(
  //       i + BLOB_BATCH_SIZE,
  //       blobs.length,
  //     )}`,
  //   );
  // }

  // // ============================================================
  // // 7. VERIFY DATA
  // // ============================================================

  // console.log('');
  // console.log('====================================');
  // console.log('🔍 SEED VERIFICATION');
  // console.log('====================================');

  // const childFolderCount = await prisma.folder.count({
  //   where: {
  //     userId: USER_ID,
  //     parentFolderId: mainFolderId,
  //   },
  // });

  // const mainFolderFileCount = await prisma.file.count({
  //   where: {
  //     userId: USER_ID,
  //     folderId: mainFolderId,
  //   },
  // });

  // const blobCount = await prisma.blobs.count({
  //   where: {
  //     userId: USER_ID,
  //   },
  // });

  // const refCount1 = await prisma.blobs.count({
  //   where: {
  //     userId: USER_ID,
  //     refCount: 1,
  //   },
  // });

  // const refCount2 = await prisma.blobs.count({
  //   where: {
  //     userId: USER_ID,
  //     refCount: 2,
  //   },
  // });

  // const refCount3 = await prisma.blobs.count({
  //   where: {
  //     userId: USER_ID,
  //     refCount: 3,
  //   },
  // });

  // console.log({
  //   mainFolderId,
  //   childFolderCount,
  //   mainFolderFileCount,
  //   blobCount,
  //   refCount1,
  //   refCount2,
  //   refCount3,
  // });

  // // ============================================================
  // // 8. DATABASE CONNECTION CHECK
  // // ============================================================

  // const result = await prisma.$queryRaw<
  //   {
  //     current_database: string;
  //     current_schema: string;
  //     inet_server_addr: string;
  //   }[]
  // >`
  //   SELECT
  //     current_database(),
  //     current_schema(),
  //     inet_server_addr()::text;
  // `;

  // console.log('Connected DB:', result);

  console.log('');
  console.log('====================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });