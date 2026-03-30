/**
 * utils/crypto.ts 测试
 * 验证签名验证和 PKCE 生成逻辑
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, generatePKCE } from "../../src/utils/crypto.js";

describe("verifySignature", () => {
  const secret = "test-webhook-secret";
  const timestamp = "1700000000";
  const body = Buffer.from('{"hello":"world"}');

  /** 计算正确签名 */
  function makeValidSignature(): string {
    const mac = createHmac("sha256", secret);
    mac.update(timestamp + ":");
    mac.update(body);
    return "sha256=" + mac.digest("hex");
  }

  it("正确签名应通过验证", () => {
    const sig = makeValidSignature();
    expect(verifySignature(secret, timestamp, body, sig)).toBe(true);
  });

  it("错误签名应验证失败", () => {
    expect(
      verifySignature(secret, timestamp, body, "sha256=0000000000000000000000000000000000000000000000000000000000000000"),
    ).toBe(false);
  });

  it("长度不匹配的签名应验证失败", () => {
    expect(verifySignature(secret, timestamp, body, "sha256=short")).toBe(false);
  });

  it("空 secret 应验证失败", () => {
    const sig = makeValidSignature();
    expect(verifySignature("", timestamp, body, sig)).toBe(false);
  });

  it("空 timestamp 应验证失败", () => {
    const sig = makeValidSignature();
    expect(verifySignature(secret, "", body, sig)).toBe(false);
  });

  it("空 signature 应验证失败", () => {
    expect(verifySignature(secret, timestamp, body, "")).toBe(false);
  });
});

describe("generatePKCE", () => {
  it("应返回 verifier 和 challenge", () => {
    const { verifier, challenge } = generatePKCE();
    expect(verifier).toBeTruthy();
    expect(challenge).toBeTruthy();
    expect(typeof verifier).toBe("string");
    expect(typeof challenge).toBe("string");
  });

  it("每次生成的结果应不同", () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).not.toBe(b.challenge);
  });

  it("verifier 应为 base64url 编码", () => {
    const { verifier } = generatePKCE();
    // base64url 不包含 +, /, = 字符
    expect(verifier).not.toMatch(/[+/=]/);
  });

  it("challenge 应为 base64url 编码", () => {
    const { challenge } = generatePKCE();
    expect(challenge).not.toMatch(/[+/=]/);
  });
});
