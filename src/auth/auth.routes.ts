import express from "express";
import logger from "../config/logger";
import { AuthController } from "./auth.controller";
import { AuthServices } from "./auth.services";
import authenticate from "../common/middlewares/authenticate";
import validateRefreshtoken from "../common/middlewares/validateRefreshtoken";
import parseRefreshToken from "../common/middlewares/parseRefreshToken";
import { AuthRequest } from "./auth.types";
import { loginSchema, registerSchema } from "./auth.validator";
import { validateBody } from "../common/middlewares/validation";

const router = express.Router();
const authServices = new AuthServices(logger);
const authcontroller = new AuthController(authServices, logger);

router.post("/register", validateBody(registerSchema), (req, res, next) =>
  authcontroller.register(req, res, next),
);

router.post("/login", validateBody(loginSchema), (req, res, next) =>
  authcontroller.login(req, res, next),
);

router.get("/self", authenticate, (req, res, next) =>
  authcontroller.self(req as AuthRequest, res, next),
);

router.post("/refresh", validateRefreshtoken, (req, res, next) =>
  authcontroller.refresh(req as AuthRequest, res, next),
);

router.post("/logout", authenticate, parseRefreshToken, (req, res, next) =>
  authcontroller.logout(req as AuthRequest, res, next),
);

router.get("/storage", authenticate, (req, res, next) =>
  authcontroller.getStorage(req as AuthRequest, res, next),
);

export default router;
