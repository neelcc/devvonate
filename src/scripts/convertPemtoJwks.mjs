import fs from "fs";
import path from "path";
import { importSPKI, exportJWK } from "jose";

const pem = fs.readFileSync(
    path.join(process.cwd(), "certs", "public.pem"),
    "utf-8",
);

const publicKey = await importSPKI(pem, "RS256");
const jwk = await exportJWK(publicKey);

const jwks = {
    keys: [
        {
            ...jwk,
            use: "sig",
            alg: "RS256",
            kid: "auth-service-key",
        },
    ],
};

console.log(JSON.stringify(jwks, null, 2));
