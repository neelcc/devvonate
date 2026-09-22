import { expressjwt } from "express-jwt";
import { Config } from "../../config/index.js";
import logger from "../../config/logger.js";
import { AuthCookie, IRefreshTokenPayload } from "../../auth/auth.types.js";
import prisma from "../../config/prisma.js";

export default expressjwt({
    secret: Config.REFRESH_TOKEN_SECRET,
    algorithms: ["HS256"],
    getToken(req) {
        const { refreshToken } = req.cookies as AuthCookie;
        return refreshToken;
    },
    async isRevoked(request, token) {
        try {
            console.log("Token payload:", token?.payload);
            if(token?.payload.sub === undefined){
                logger.error("Refresh token is missing sub claim");
                return true;
            }
               const refreshToken = await prisma.refreshToken.findUnique({
                where: {
                    id: Number((token?.payload as IRefreshTokenPayload).id),
                    user : {
                        id : token?.payload.sub
                    }
                },
                include: {
                    user: true,
                },
            })

            return refreshToken === null;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            logger.error("Error while getting the refresh token", {
                id: (token?.payload as IRefreshTokenPayload).id,
            });
        }
        return true;
    },
});
