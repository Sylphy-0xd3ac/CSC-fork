// 用于检查一个 IPv4 地址是否在指定的 CIDR 范围内

import pkg from "fs-extra";
const { readFileSync } = pkg;
import { join } from "node:path";

/** IP 基础属性 */
const IP = {
  v4: {
    SEPARATOR: ".",
    CIDR_SUBNET_SEPARATOR: "/",
    REGEX: /^(\d{1,3}\.){3}\d{1,3}$/,
    BITS: 32,
  },
  v6: {
    SEPARATOR: ":",
    CIDR_SUBNET_SEPARATOR: "/",
    REGEX: /^([0-9a-f]{1,4}:){7}([0-9a-f]{1,4})$/,
    REGEX_ABBREVIATED:
      /^([0-9a-f]{1,4}(:[0-9a-f]{1,4})*)?::([0-9a-f]{1,4}(:[0-9a-f]{1,4})*)?$/,
    PARTS: 8,
    BITS: 128,
  },
};

/**
 * 将 IPv6 地址解析为 BigInt
 *
 * @param {string} address - 要解析的 IPv6 地址
 * @returns {BigInt} 解析后的地址
 */
function IPv6toInteger(address) {
  // If the address is a full IPv6 address
  if (IP.v6.REGEX.test(address)) {
    // Directly convert the address to a BigInt
    return BigInt(
      "0x" +
        address
          .split(IP.v6.SEPARATOR)
          .map((part) => part.padStart(4, "0"))
          .join(""),
    );

    // Or if the address is an abbreviated IPv6 address
  } else if (IP.v6.REGEX_ABBREVIATED.test(address)) {
    // Split the address into left and right parts
    let [left, right] = address.split(IP.v6.SEPARATOR + IP.v6.SEPARATOR);

    // Split the left and right parts into their components
    left = left.split(IP.v6.SEPARATOR).map((part) => part.padStart(4, "0"));
    right = right.split(IP.v6.SEPARATOR).map((part) => part.padStart(4, "0"));

    // Count the number of zero parts
    const zeroCount = IP.v6.PARTS - left.length - right.length;
    if (zeroCount < 0) {
      throw new Error("Invalid IPv6 address: " + address);
    }

    // Create the zero part
    const zeroPart = "0000".repeat(zeroCount);

    // Join the parts together
    return BigInt("0x" + [...left, zeroPart, ...right].join(""));
  } else {
    throw new Error("Invalid IPv6 address: " + address);
  }
}

/**
 * 解析 IPv6 CIDR
 *
 * @param {string} cidr - 要解析的 IPv6 CIDR
 * @returns {Object} 解析后的地址和掩码
 * @property {BigInt} address - 解析后的地址
 * @property {number} mask - 解析后的掩码
 */
function parseIPv6CIDR(cidr) {
  let [address, mask] = cidr.trim().split(IP.v6.CIDR_SUBNET_SEPARATOR);

  // Make sure the mask is a number
  if (Number(mask).toString() !== mask) {
    throw new Error("Invalid CIDR: " + cidr);
  } else if (Number(mask) < 0 || Number(mask) > IP.v6.BITS) {
    throw new Error("Invalid CIDR: " + cidr);
  }

  try {
    // Parse the address
    address = IPv6toInteger(address);
  } catch (error) {
    // If the address is invalid, throw an error
    throw new Error("Invalid CIDR: " + cidr);
  }

  return { address, mask: Number(mask) };
}

/**
 * 将 IPv4 地址解析为 BigInt 与 IPv6 相同
 *
 * @param {string} address - 要解析的 IPv4 地址
 * @returns {BigInt} 解析后的地址
 */
function IPv4toInteger(address) {
  // Check if the address is valid
  if (!IP.v4.REGEX.test(address)) {
    throw new Error("Invalid IPv4 address: " + address);
  }

  // Split the address into its components
  let parts = address.split(IP.v4.SEPARATOR);
  parts = parts.map((part) => parseInt(part, 10));

  // Check if the parts are valid
  for (let part of parts) {
    if (part < 0 || part > 255) {
      throw new Error("Invalid IPv4 address: " + address);
    }
  }

  // Convert the address to a BigInt
  return (
    BigInt(
      parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3],
    ) | 0xffff00000000n
  );
}

/**
 * 解析 IPv4 CIDR
 *
 * @param {string} cidr - 要解析的 IPv4 CIDR
 * @returns {Object} 解析后的地址和掩码
 * @property {BigInt} address - 解析后的地址
 * @property {number} mask - 解析后的掩码
 */
function parseIPv4CIDR(cidr) {
  let [address, mask] = cidr.trim().split(IP.v4.CIDR_SUBNET_SEPARATOR);

  // Make sure the mask is a number
  if (Number(mask).toString() !== mask) {
    throw new Error("Invalid CIDR: " + cidr);
  } else if (Number(mask) < 0 || Number(mask) > IP.v4.BITS) {
    throw new Error("Invalid CIDR: " + cidr);
  }

  try {
    // Parse the address
    address = IPv4toInteger(address);
  } catch (error) {
    // If the address is invalid, throw an error
    throw new Error("Invalid CIDR: " + cidr);
  }

  return { address, mask: Number(mask) + 96 };
}

/**
 * 解析 IPv4-mapped IPv6 地址
 *
 * @param {string} address - 要解析的 IPv4-mapped IPv6 地址
 * @return {BigInt} 解析后的地址
 */
function parseIPv4MappedIPv6(address) {
  // Extract the IPv4 address from the IPv4-mapped IPv6 address
  const ipv4 = address.slice(address.lastIndexOf(IP.v6.SEPARATOR) + 1);
  const ipv6 = address.slice(0, address.lastIndexOf(IP.v6.SEPARATOR));

  // Check if the IPv4 address is valid
  if (!IP.v4.REGEX.test(ipv4)) {
    throw new Error("Invalid IPv4-mapped IPv6 address: " + address);
  }

  // Check the IPv6 address equal to 0xffff
  if (IPv6toInteger(ipv6) !== BigInt(0xffff)) {
    throw new Error("Invalid IPv4-mapped IPv6 address: " + address);
  }

  // Parse the IPv4 address
  return IPv4toInteger(ipv4);
}

/**
 * 解析 IPv4-mapped IPv6 CIDR
 *
 * @param {string} cidr - 要解析的 IPv4-mapped IPv6 CIDR
 * @returns {Object} 解析后的地址和掩码
 * @property {BigInt} address - 解析后的地址
 * @property {number} mask - 解析后的掩码
 */
function parseIPv4MappedIPv6CIDR(cidr) {
  let [address, mask] = cidr.trim().split(IP.v6.CIDR_SUBNET_SEPARATOR);

  // Make sure the mask is a number
  if (Number(mask).toString() !== mask) {
    throw new Error("Invalid CIDR: " + cidr);
  } else if (Number(mask) < 96 || Number(mask) > IP.v6.BITS) {
    throw new Error("Invalid CIDR: " + cidr);
  }

  try {
    // Parse the address
    address = parseIPv4MappedIPv6(address);
  } catch (error) {
    // If the address is invalid, throw an error
    throw new Error("Invalid CIDR: " + cidr);
  }

  return { address, mask: Number(mask) };
}

/**
 * 将地址解析为 BigInt
 * 可用格式：
 * - IPv6 (全格式和缩写格式 )
 * - IPv4
 * - IPv4-mapped IPv6
 *
 * @param {string} address 要解析的地址
 * @return {BigInt} 解析后的地址
 */
export function parseAddress(address) {
  address = address.toLowerCase();

  try {
    return IPv6toInteger(address);
  } catch (error) {
    try {
      return IPv4toInteger(address);
    } catch (error) {
      try {
        return parseIPv4MappedIPv6(address);
      } catch (error) {
        throw new Error("Invalid address: " + address);
      }
    }
  }
}

/**
 * 解析 CIDR
 * 可用格式：
 * - IPv6 (全格式和缩写格式 )
 * - IPv4
 * - IPv4-mapped IPv6
 *
 * @param {string} cidr 要解析的 CIDR
 * @return {Object} 解析后的地址和掩码
 * @property {BigInt} address - 解析后的地址
 * @property {number} mask - 解析后的掩码
 */
export function parseCIDR(cidr) {
  cidr = cidr.toLowerCase();

  try {
    return parseIPv6CIDR(cidr);
  } catch (error) {
    try {
      return parseIPv4CIDR(cidr);
    } catch (error) {
      try {
        return parseIPv4MappedIPv6CIDR(cidr);
      } catch (error) {
        throw new Error("Invalid CIDR: " + cidr);
      }
    }
  }
}

/**
 * 前缀树类，用于高效匹配 IP 地址
 */
export class AddressTree {
  #root;

  constructor() {
    this.#root = new Map();
  }

  insertCIDR(address, mask) {
    let node = this.#root;
    for (let i = 0; i < mask; i++) {
      const bit = (address >> BigInt(IP.v6.BITS - i - 1)) & 1n;
      if (!node.has(bit)) {
        node.set(bit, new Map());
      }
      node = node.get(bit);
    }
    node.set("end", true);
  }

  contains(address) {
    let node = this.#root;
    for (let i = 0; i < IP.v6.BITS; i++) {
      const bit = (address >> BigInt(IP.v6.BITS - i - 1)) & 1n;
      if (!node.has(bit)) {
        return false;
      }
      node = node.get(bit);
      if (node.get("end")) {
        return true;
      }
    }
    return false;
  }
}

export async function run(hazel, core, hold) {
  /**
   * 加载允许的 CIDR 列表
   */
  core.loadAllowCIDR = function () {
    let rawCIDRlist;
    try {
      rawCIDRlist = readFileSync(
        join(hazel.mainConfig.baseDir, hazel.mainConfig.allowCIDRlistDir),
        { encoding: "utf-8" },
      );
    } catch (error) {
      hazel.emit("error", error);
      return;
    }

    rawCIDRlist = rawCIDRlist.split("\n");
    for (let item of rawCIDRlist) {
      if (item.startsWith("#") || item.trim() === "") continue; // 跳过注释和空行
      try {
        const { address, mask } = parseCIDR(item);
        hold.allowTree.insertCIDR(address, mask);
      } catch (error) {
        hazel.emit("error", `Invalid CIDR: ${item}`);
      }
    }
  };

  /**
   * 加载拒绝的 CIDR 列表
   */
  core.loadDenyCIDR = function () {
    let rawCIDRlist;
    try {
      rawCIDRlist = readFileSync(
        join(hazel.mainConfig.baseDir, hazel.mainConfig.denyCIDRlistDir),
        { encoding: "utf-8" },
      );
    } catch (error) {
      hazel.emit("error", error);
      return;
    }

    rawCIDRlist = rawCIDRlist.split("\n");
    for (let item of rawCIDRlist) {
      if (item.startsWith("#") || item.trim() === "") continue; // 跳过注释和空行
      try {
        const { address, mask } = parseCIDR(item);
        hold.denyTree.insertCIDR(address, mask);
      } catch (error) {
        hazel.emit("error", `Invalid CIDR: ${item}`);
      }
    }
  };

  /**
   * 添加允许的 CIDR
   * @param {string} cidr CIDR 字符串
   * @returns {boolean}
   */
  core.allowCIDR = function (cidr) {
    try {
      const { address, mask } = parseCIDR(cidr);
      hold.allowTree.insertCIDR(address, mask);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * 添加拒绝的 CIDR
   * @param {string} cidr CIDR 字符串
   * @returns {boolean}
   */
  core.denyCIDR = function (cidr) {
    try {
      const { address, mask } = parseCIDR(cidr);
      hold.denyTree.insertCIDR(address, mask);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * 检查 IP 地址是否在允许或拒绝列表中
   * @param {string} ip IP 地址
   * @returns {[boolean, boolean]} [是否允许, 是否拒绝]
   */
  core.checkIP = function (ip) {
    try {
      switch (hazel.mainConfig.cidrPolicy) {
        case "deny":
          return [
            !hold.denyTree.contains(parseAddress(ip)),
            hold.denyTree.contains(parseAddress(ip)),
          ];
        case "allow":
          return [
            hold.allowTree.contains(parseAddress(ip)),
            !hold.allowTree.contains(parseAddress(ip)),
          ];
        case "close":
          return [true, false];
      }
    } catch (error) {
      return [false, false];
    }
  };
}

export const priority = 16;
