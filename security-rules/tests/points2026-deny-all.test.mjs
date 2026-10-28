import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { readFile } from "node:fs/promises";

const projectId = "points2026-rules-test";
let testEnv;

before(async () => {
  const rules = await readFile(new URL("../points2026-emergency.deny-all.rules", import.meta.url), "utf8");
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules, host: "127.0.0.1", port: 8080 },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("points2026 emergency deny-all rules", () => {
  it("denies signed-out reads and writes", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/12345")));
    await assertFails(getDocs(collection(db, "users")));
    await assertFails(setDoc(doc(db, "users/12345"), { name: "test" }));
    await assertFails(updateDoc(doc(db, "users/12345"), { name: "test" }));
    await assertFails(deleteDoc(doc(db, "users/12345")));
  });

  it("denies authenticated reads and writes, including admin-looking claims", async () => {
    const db = testEnv.authenticatedContext("test-user", {
      email: "12345@auth.25withcoding.kr",
      admin: true,
    }).firestore();
    await assertFails(getDoc(doc(db, "users/12345")));
    await assertFails(getDocs(collection(db, "users")));
    await assertFails(setDoc(doc(db, "users/12345"), { name: "test" }));
    await assertFails(updateDoc(doc(db, "users/12345"), { name: "test" }));
    await assertFails(deleteDoc(doc(db, "users/12345")));
  });

  it("denies access to non-user collections too", async () => {
    const db = testEnv.authenticatedContext("test-user").firestore();
    await assertFails(getDoc(doc(db, "attendance/12345")));
    await assertFails(setDoc(doc(db, "scores/12345"), { score: 10 }));
  });
});
