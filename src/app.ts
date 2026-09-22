import express from "express";
import  AuthRoutes  from "./auth/auth.routes";
import  FoldersRoutes  from "./folders/folder.routes";
import  UploadRoutes  from "./upload/upload.routes";
import FilesRoutes from "./files/file.routes"
import { globalErrorHandler } from "./common/middlewares/globalErrorHandler";
import cookieParser from "cookie-parser";
import path from "path";

export const app = express();
app.use(express.json());
app.use(
    "/.well-known",
    express.static(path.join(__dirname, "../public/.well-known")),
);
app.use('/api/v1/users', AuthRoutes )
app.use('/api/v1/folders', FoldersRoutes )
app.use('/api/v1/uploads', UploadRoutes )
app.use('/api/v1/files', FilesRoutes);
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
// app.use(
//     "/.well-known",
//     express.static(path.join(__dirname, "../public/.well-known")),
// );
app.use(globalErrorHandler);
app.get("/", (req, res) => {
    res.send("Welcome to the Admin Service API");
});


