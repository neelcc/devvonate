    import { expressjwt, type GetVerificationKey } from "express-jwt";
    import JwksRsa from "jwks-rsa";
    import { Config } from "../../config/index.js";
    import { AuthCookie } from "../../auth/auth.types.js";

    export default expressjwt({
        secret: JwksRsa.expressJwtSecret({
            jwksUri: Config.JWKS_URI,
            cache: true,
            rateLimit: true,
        }) as GetVerificationKey,
        algorithms: ["RS256"],
        getToken: (req) => {

            if (
                req.headers.authorization &&
                req.headers.authorization.split(" ")[1]
            ) {
                const token = req.headers.authorization.split(" ")[1];

                if (token) {
                    return token;
                }
            }

            const { accessToken } = req.cookies as AuthCookie;

            return accessToken;
        },
    });
