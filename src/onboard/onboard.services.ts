import { Prisma } from "../generated/prisma/client";
import { Config } from "../config";
import { randomUUID } from "node:crypto";
import prisma from "../config/prisma";
import logger from "../config/logger";

class OnboardServices {
  constructor() {}

  async initializeUser(userId: string) {
    await prisma.$transaction(async (prismaTx) => {
      await prismaTx.userStorage.create({
        data: {
          userId: userId,
          totalBytes: BigInt(Config.FREE_TIER_BYTES), // 2GB in bytes
          usedBytes: BigInt(0),
          trashBytes: BigInt(0),
          reservedBytes: BigInt(0),
        },
      });

      const rootName = randomUUID();

      const folder = await prismaTx.folder.create({
        data: {
          userId: userId,
          name: rootName,
          parentFolderId: null,
        },
        select: {
          id: true,
          name: true,
          parentFolderId: true,
        },
      });

      await prismaTx.user.update({
        where: {
          id: userId,
        },
        data: {
          rootFolderId: folder.id,
        },
      });
    });

    logger.info(
      `OnboardServices.initializeUser: User storage and root folder initialized for user ${userId}`,
    );
  }
}


const onboardServices = new OnboardServices();

export default onboardServices;