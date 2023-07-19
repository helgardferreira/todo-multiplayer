import { createMachine, assign, StateValueFrom, InterpreterFrom } from "xstate";

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
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FWwHQEMDGyAlgG5gDEAggCJUD6AkgCoCiAsgNoAMAuoqAA6ZCRVADs+IAB6IALAHYATFhkBmOfLkBGAKyaAbNs4KANCACeiABydtWFTb0yF27Xs0Bfd6bQZs+IqRkAKoAClQULAwsHDwSgrDChGIS0ggyenp2lhnWAJzpipamFgh6lppYlrn5Mpx6igoymnKe3uiYuAQk5FTMADLMkUxsXLxIIPGJyeOpBZUqmtVyuZqaCioKctrFiC6WyrkLbtW5ZTatID4d-t1YsGaieISiUGRgAE7vqO9Y-AA2OGQADNvgBbLBXPxdUh3B5PF4IZ7EVB4QFJUSjUZxIQicQzRCaThrLBElwybQyXLlZqaHYITT2FRYRr2dQUlR6fIXSGdAJgWGPZ6vKj0ADKFAAQgNaKKAJoAOQAwljxpNcSlECoVLZLKp1GU9EY1HI6atFMpOLk5NaFJp0pZNtz2lC+QL4a9xQA1ZgqgQ49Ea+mWWyEnQuMrBhkZU06GRYDKGBm2zhGbQqJ2+Xm3e6Cl5kOVK30Tf3TUCpTTWLDNU5WlSHSy6uqmmz7W0VuR6FQO7T1jPXaH8wgQP7kZjyyXSgvK2Kqkt4su7fKVBR5XJEtRdmQx821K02u1lR1eS7OrMwv6oHAQIVvT7fX4A4FgiGnm7ny-XhFIlFosSYmd+gk6r4vSnAbCSYbkpS1JyCoMaGgcCwrGsqbnMePJvvyF5XjeABKzBTkWaoBiBjgVGmawVqo2iWCo5LNjozJ1J2ciWKxtS2n22DYZ+rwfF8Pz-ICILvOCPI8UKiKiMiqK4v+YyAVM85SIgAC0lJYFahqLA6Wj1AYppNBUwawacTQduouRcVgEl5n0ADy1BEXOgb2LYVJ1goKxuLawZ0h2+ywfUNjpKsnKWJ4x6iOgcASJC2JASRC4IKpVqaR2RJUps+gdts5iyHInCaYc+gcoVLLWZhCVKYGhJbvlCC5JsWCFTkmyNOkXLoa+A5ukK1XAclOgmA1ayuFWFY6CmajkpylW9UOI4DUlKkILoFQbOUYEuHRrLbkoa57ooB66fNrq2VAy2lqtuWabqWqKG4dW5DG2rFUc1QLF2HLWRdV3KeWNhMdUaYptYsG0g1AXMkmWwKGUXYdtZQI4IQI4QP9tUVrk8bLHojR6Y0eive5JWciV316JF7hAA */
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
                actions: "sync",
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
                actions: ["sync", "save"],
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
      sync: assign(({ doc }, { data }) => {
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
