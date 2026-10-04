import { UploadAttemptArgs } from "../common/constants/types";
import { Config } from "../config";
import { redis } from "../config/redis";


const MAX_PART_RETRIES = Config.MAX_PART_RETRIES || 3;
const FAILURE_TTL = Config.FAILURE_TTL || 60 * 60; // 1 hour

function getPartFailureKey(data : UploadAttemptArgs) {
  return `upload:${data.s3UploadId}:part:${data.partNumber}:failures`;
}

export async function incrementPartFailCount(data : UploadAttemptArgs) {
  const key = getPartFailureKey(data);

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, FAILURE_TTL);
  }

  return attempts;
}

export async function clearPartFailCount(data : UploadAttemptArgs) {
  const key = getPartFailureKey(data);
  await redis.del(key);
}

