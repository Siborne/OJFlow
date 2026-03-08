import { test, expect, describe } from "bun:test";
import Contest from "../../src/views/Contest.vue";
import Favorite from "../../src/views/Favorite.vue";
import Feature from "../../src/views/Feature.vue";
import Settings from "../../src/views/Settings.vue";

describe("View Components Structure", () => {
  test("Contest component should be importable", () => {
    expect(Contest).toBeDefined();
  });

  test("Favorite component should be importable", () => {
    expect(Favorite).toBeDefined();
  });

  test("Feature component should be importable", () => {
    expect(Feature).toBeDefined();
  });

  test("Settings component should be importable", () => {
    expect(Settings).toBeDefined();
  });
});
