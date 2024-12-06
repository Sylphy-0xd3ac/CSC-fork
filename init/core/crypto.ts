// 加密安全
import argon2 from "argon2";
import { Buffer } from "node:buffer";

export async function run(hazel, core, hold) {
  // 生成key, 使用Argon2id算法
  core.generateKeys = async function (password) {
    const argonKey = await argon2.hash(password, {
      type: argon2.argon2id,
      hashLength: 32,
      timeCost: 3,
      memoryCost: 4096,
      parallelism: 2,
      secret: Buffer.from(core.config.salts.secret),
    });
    return await argonKey.toString();
  };
  // 验证key, 使用Argon2id算法
  core.vetifyKeys = async function (password, key) {
    try {
      return await argon2.verify(key, password, {
        secret: Buffer.from(core.config.salts.secret),
      });
    } catch (error) {
      return false;
    }
  };

  // 生成trip, 使用Argon2id算法
  core.generateTrips = async function (password) {
    const argonTrip = await argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: 3,
      hashLength: 6,
      memoryCost: 4096,
      parallelism: 2,
      secret: Buffer.from(core.config.salts.secret),
      salt: Buffer.from(core.config.salts.auth),
    });
    return argonTrip.toString().split("$")[5];
  };
}

export const priority = 0;
