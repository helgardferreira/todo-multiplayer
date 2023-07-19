import {
  createMachine,
  interpret,
  assign,
  StateValueFrom,
  InterpreterFrom,
} from "xstate";

import type { Doc } from "@automerge/automerge";
import * as Automerge from "@automerge/automerge";

import { Todo, TodoList } from "../../types";
import { Observable, from, map } from "rxjs";
import { getFromDb, putInDb } from "../db";
import fromChannel from "../../lib/rxjs/fromChannel";
import { raise } from "xstate/lib/actions";

type TodosMachineContext = {
  doc?: Doc<TodoList>;
};

type TodoUpdateData = Partial<Omit<Todo, "id">>;

type AddItemEvent = { type: "ADD_ITEM"; text: string };
type UpdateItemEvent = {
  type: "UPDATE_ITEM";
  id: string;
  data: TodoUpdateData;
};
type DeleteItemEvent = { type: "DELETE_ITEM"; id: string };
type LoadEvent = { type: "LOAD"; data?: Uint8Array };
type SyncEvent = { type: "SYNC"; data: Uint8Array };
type EnableSyncEvent = { type: "ENABLE_SYNC" };
type DisableSyncEvent = { type: "DISABLE_SYNC" };
type SaveEvent = { type: "SAVE" };
type ResyncEvent = { type: "RESYNC"; data: Uint8Array };
type TodosMachineEvent =
  | AddItemEvent
  | UpdateItemEvent
  | DeleteItemEvent
  | LoadEvent
  | SyncEvent
  | EnableSyncEvent
  | DisableSyncEvent
  | SaveEvent
  | ResyncEvent;

const broadcastChannel = new BroadcastChannel("todos");

const todosMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FWwHQEMDGyAlgG5gDEAggCJUD6AkgCoCiAsgNoAMAuoqAA6ZCRVADs+IAB6IALAHYATFhkBmOTIAc6uSoCsugJwyANCACeiDZ11YV1gGwBGFQpUzd8xwF8vptBmx8IlIyAFUABSoKFgYWDh4JQVhhQjEJaQQZe3tbDXs5Tic5XXsNR2LTCwRSxywNAwM9GQNdOUaNHz90TFwCEnIqZgAZZhimNi5eJBAklLTpjKy5OpdOVwVOAwVHeyzKxH0NZUbN7LKXA06Qfx6g-qxYM1E8QlEoMjAAJ0-UT6x+AA2OGQADNfgBbLA3QJ9UgPJ4vN4IV7EVB4YGpUSTSaJIQicQLRCOTiOJQkkqcOSOFr2BQGRz7BDOTgqLAKVSOXQqFQaDS6BQdXzXbow4JgeHPV7vKj0ADKFAAQiNaLKAJoAOQAwjjprN8elENybBpVDpCo03HpGY5ykoZJsrAZioU7IKugFemKJYj3vKAGrMHUCPGYg1MvlYYmc5otFS0hSua3RrDZXQk0pqXSkq7Qz33R6St5kNVaoMzEPzUAZRxWSNtfKcTgyZw2gzW6xHbY1k0adkKOS0nMivNwwgQAHkZjqxXKkvahK6isEqsHIx1AXErLlF1JxTKB2bZ32V1Dj13OEA1A4CBSj7fX7-IGgiFQ4fn8WX69S5GiVHo-HYguwbJPqhJMiyZKcvYlLUiUdJJtBxwqMSHh8iyMinrcsIfleN5FgASswc5lnqoZgbstRcqSmZxg09i6O2nJsoUpSFNRCiDkKuafnh7xfD8fyAsCYKfJC3G4d+KJohiYiAVMwFzMuUiILSjJppwWANMhxIGE4cYePYmHYDxt5DAA8tQJFLmGGxHOUun0Y2VK7K01q9lgXINAYTYsqS9GCkKojoHAEjQriIFkSuCAALT2IytYDvRenUjIMiuEZI5gOFilhpujJbMsBTZPkdJbGxGXvt6UrZaBUWcgo1oKCUkY1qShj2sUGFcW+2FYGOE41ZFykIFmtQuGUEFOu4Aq7ko3kGI6R52LoFW9SZbyDZWw0DjYC2qPoTicHyM3mESzi7Y0pKaA0jaFBl61QJtSmLA1p1MqUbKplmihNaUC0ZSCOCEBOEBPblNYGCm9ZlPUVJpq9VQ2nommXey9TeY2hk+F4QA */
    id: "todos",
    tsTypes: {} as import("./todos.machine.typegen").Typegen0,
    predictableActionArguments: true,
    schema: {
      context: {} as TodosMachineContext,
      events: {} as TodosMachineEvent,
    },
    context: {},
    initial: "loading",
    states: {
      active: {
        on: {
          ADD_ITEM: {
            actions: ["addItem", "attemptSave"],
          },

          UPDATE_ITEM: {
            actions: ["updateItem", "attemptSave"],
          },

          DELETE_ITEM: {
            actions: ["deleteItem", "attemptSave"],
          },
        },

        states: {
          syncing: {
            invoke: {
              src: "sync$",
              onError: "#todos.failed",
            },

            on: {
              DISABLE_SYNC: "idle",

              SAVE: {
                target: "syncing",
                internal: true,
                actions: "save",
              },

              SYNC: {
                target: "syncing",
                actions: "merge",
                internal: true,
              },
            },
          },

          idle: {
            on: {
              ENABLE_SYNC: "loading",
            },
          },

          loading: {
            invoke: {
              src: "resync$",
              onError: "#todos.failed",
            },

            on: {
              RESYNC: {
                target: "syncing",
                actions: ["merge", "save"],
              },
            },
          },
        },

        initial: "syncing",
      },

      loading: {
        on: {
          LOAD: {
            target: "active",
            actions: "load",
          },
        },

        invoke: {
          src: "load$",
          onError: "failed",
        },
      },

      failed: {
        entry: "onFail",
      },
    },
  },
  {
    actions: {
      addItem: assign(({ doc }, { text }) => {
        if (!doc) throw new Error("Todos document is missing");
        if (text === "") return {};

        const newDoc = Automerge.change(doc, (doc) => {
          doc.items.push({ text, done: false, id: crypto.randomUUID() });
        });

        return { doc: newDoc };
      }),
      updateItem: assign(({ doc }, { id, data }) => {
        if (!doc) throw new Error("Todos document is missing");

        const newDoc = Automerge.change(doc, (doc) => {
          const todoIdx = doc.items.findIndex((item) => item.id === id);
          if (todoIdx === -1) return;

          // Need to be as fine-grained as possible (ideally) for automerge
          if (data.done !== undefined) doc.items[todoIdx].done = data.done;
          if (data.text !== undefined) doc.items[todoIdx].text = data.text;
        });

        return {
          doc: newDoc,
        };
      }),
      deleteItem: assign(({ doc }, { id }) => {
        if (!doc) throw new Error("Todos document is missing");

        const newDoc = Automerge.change(doc, (doc) => {
          const todoIdx = doc.items.findIndex((item) => item.id === id);
          if (todoIdx === -1) return;

          doc.items.splice(todoIdx, 1);
        });

        return {
          doc: newDoc,
        };
      }),
      load: assign((_, { data }) => {
        if (data) return { doc: Automerge.load<TodoList>(data) };

        return { doc: Automerge.from<TodoList>({ items: [] }) };
      }),
      attemptSave: raise("SAVE"),
      save: ({ doc }) => {
        if (!doc) throw new Error("Todos document is missing");

        const binary = Automerge.save(doc);
        putInDb("todos", binary).catch((err) => {
          console.error("Error saving to db");
          console.error(err);
        });
        broadcastChannel.postMessage(binary);
      },
      merge: assign(({ doc }, { data }) => {
        if (!doc) throw new Error("Todos document is missing");

        const newDoc = Automerge.merge(doc, Automerge.load(data));

        return {
          doc: newDoc,
        };
      }),
      onFail: () => {
        console.error("Failed to sync todos");
      },
    },
    services: {
      load$: (): Observable<LoadEvent> =>
        from(getFromDb("todos")).pipe(map((data) => ({ type: "LOAD", data }))),
      sync$: (): Observable<SyncEvent> =>
        fromChannel(broadcastChannel).pipe(
          map((data) => ({ type: "SYNC", data }))
        ),
      resync$: (): Observable<ResyncEvent> =>
        from(getFromDb("todos")).pipe(
          map((data) => ({ type: "RESYNC", data }))
        ),
    },
  }
);

export { todosMachine };

type TodosMachineService = InterpreterFrom<typeof todosMachine>;

type TodosMachineStateValue = Exclude<
  StateValueFrom<typeof todosMachine>,
  object
>;

export type { TodoUpdateData, TodosMachineService, TodosMachineStateValue };
