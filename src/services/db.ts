import { openDB } from "idb";

const dbPromise = openDB("todos-db", 1, {
  upgrade(db) {
    db.createObjectStore("todos-store");
  },
});

async function getFromDb(key: IDBKeyRange | IDBValidKey) {
  return (await dbPromise).get("todos-store", key);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function putInDb(key: IDBKeyRange | IDBValidKey, val: any) {
  return (await dbPromise).put("todos-store", val, key);
}
async function delFromDb(key: IDBKeyRange | IDBValidKey) {
  return (await dbPromise).delete("todos-store", key);
}
async function clearFromDb() {
  return (await dbPromise).clear("todos-store");
}
async function getDbKeys() {
  return (await dbPromise).getAllKeys("todos-store");
}

export { getFromDb, putInDb, delFromDb, clearFromDb, getDbKeys };
