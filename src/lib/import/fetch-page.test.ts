import { describe, expect, it } from "vitest";
import { fetchPublic, isPublicAddress, readWebAddress } from "./fetch-page";

describe("which addresses the app may fetch", () => {
  it.each([
    ["93.184.216.34", true],
    ["8.8.8.8", true],
    ["127.0.0.1", false],
    ["10.1.2.3", false],
    ["172.16.0.1", false],
    ["172.32.0.1", true],
    ["192.168.1.10", false],
    ["169.254.169.254", false], // cloud metadata
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["::1", false],
    ["fd00::1", false],
    ["fe80::1", false],
    ["::ffff:127.0.0.1", false],
    ["2606:4700::1111", true],
    ["not an ip", false],
  ])("%s → %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });

  it("accepts only plain http(s) web addresses", () => {
    expect(readWebAddress("https://www.bbcgoodfood.com/recipes/x")?.hostname).toBe("www.bbcgoodfood.com");
    expect(readWebAddress("ftp://example.com/x")).toBeNull();
    expect(readWebAddress("javascript:alert(1)")).toBeNull();
    expect(readWebAddress("https://user:pass@example.com/")).toBeNull();
    expect(readWebAddress("http://example.com:8080/")).toBeNull();
    expect(readWebAddress("just some text")).toBeNull();
  });

  it("refuses to fetch this machine or a home network, before sending anything", async () => {
    for (const address of ["http://localhost:3000/", "http://127.0.0.1/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data"]) {
      const result = await fetchPublic(address, { accept: "text/html", maxBytes: 1000 });
      expect(result).toMatchObject({ ok: false });
    }
  });
});
