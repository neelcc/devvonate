import { expressjwt } from "express-jwt";
import { Config } from "../../config/index.js";
import { AuthCookie } from "../../auth/auth.types.js";

export default expressjwt({
    secret: Config.REFRESH_TOKEN_SECRET,
    algorithms: ["HS256"],
    getToken(req) {
        const { refreshToken } = req.cookies as AuthCookie;

        return refreshToken;
    },
});
