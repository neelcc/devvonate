import { Logger } from "winston";
import { Prisma } from "../generated/prisma/client";
import { Config } from "../config";
import { randomUUID } from "node:crypto";

export class OnboardServices {


    constructor(private logger: Logger) {
    }

    async initializeUser(prismaTx: Prisma.TransactionClient, userId: string) {
        await prismaTx.userStorage.create({
            data: {
                userId: userId,
                totalBytes: BigInt(Config.FREE_TIER_BYTES), // 2GB in bytes
                usedBytes: BigInt(0),
                trashBytes: BigInt(0),
                reservedBytes: BigInt(0),

            }
        })
        const rootName = randomUUID();
        const folder = await prismaTx.folder.create({
            data: {
                userId: userId,
                name: rootName,
                path: "",
                parentFolderId: null,
            },
            select: {
                id: true,
            }
        })

        await prismaTx.folder.update({
            where: { id: folder.id },
            data: {
                path: folder.id
            }
        })

        await prismaTx.user.update({
            where: {
                id: userId,
            },
            data: {
                rootFolderId: folder.id,
            }
        })

        this.logger.info(`OnboardServices.initializeUser: User storage and root folder initialized for user ${userId}`);
    }

}