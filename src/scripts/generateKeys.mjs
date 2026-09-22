import crypto from "crypto";
import fs from "fs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: "spki",
        format: "pem",
    },

    privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
    },
});

const currentPath = process.cwd();

fs.writeFileSync(`${currentPath}/certs/private.pem`, privateKey);
fs.writeFileSync(`${currentPath}/certs/public.pem`, publicKey);
