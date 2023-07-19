import { createMachine, interpret, assign, StateValueFrom } from "xstate";

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
type MergeEvent = { type: "MERGE"; data: Uint8Array };
type EnableSyncEvent = { type: "ENABLE_SYNC" };
type DisableSyncEvent = { type: "DISABLE_SYNC" };
type SaveEvent = { type: "SAVE" };
type ResyncEvent = { type: "RESYNC"; data: Uint8Array };
type TodosMachineEvent =
  | AddItemEvent
  | UpdateItemEvent
  | DeleteItemEvent
  | LoadEvent
  | MergeEvent
  | EnableSyncEvent
  | DisableSyncEvent
  | SaveEvent
  | ResyncEvent;

const broadcastChannel = new BroadcastChannel("todos");

const todosMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FWwHQEMDGyAlgG5hawCeAdnoVVAMRgBOzqzWADgDY7IBm7ALZY0GbPiKly1WvQR1iqPH0KoqAbQAMAXW07EoTpkJF1hkAA9EARi02ATFnsBWAGwB2AJw+3WgByBADQgFLYAzFrhWA4ALOE2-g4uNh4pHg4AvpkhYpi4BCRgDACCACJlAPoAkgAqAKIAsvoWxrCmalQW1gixGVjxaTZeHuFjDp4hYQj+Wi5Yke4O4V4pPl7h2bno+ZJFDACqAAplJQ01Dc26rSZmXUhWiLFubgv+nrEuLl4OXjZjU0Qbn8Niw-h84Tcyy8ILiHi2IDyEkKpAYZXqABl6uc6k0Wg82h1zA8es8PGDwg4tPF4gEXA4HICEF9-AMNo4oQkArEEUisNxUDgIHRGCw2BweHxBMwRHyBUKRQoqEoVHd9PijLdOt0gYzQogXFotFgIRy-Gkvjycoidth5cL6AwMQB5coakCEu46hBU1mpLzA4HDOIB2JMxJOFyxI3UoMOOw-Xm2gpSMiUGgitHVADKJQAQljKtmAJoAOQAwu7PdqSYgxvN-INgX0jSN-uHUk5ozDwmkNm5HEnxCmilhCBBuMV6qX84WSxWq1riaAet9YmCHCDIjYo7F3m4O-1u+9frNYs8vEPdiiyPbMwAlerzyvXAlL+4roGxUEuBKb8KBAE-gAeGrgxFonhaCMEH-BBV7Iqm-KCg6oqsOwXC8AIwiiMmezSHe8iKMoqjqOqr6au0Xq1ggdiUs4O6eOsfiBB4HZ+GylITB4sQjL+VrbMOeFprIma5gAavUi6UTWn40f48x2DuaScTuPHhB2UZYC8hreDYsRUvEbjwSO0jpnIjCNPU94AOKSeRHrvt6iTGv6bg-AOZIwnq0x2C4rLxsGwYQRMLjZNaVDoHAFhIjc0nLo8CAALQHvqMzGh42n0nEHLhH5xlCbFRIfgldhhqlPzkh4EEZNGbiGp8-j5TeMgZvQhVUbJO7ebYySvDYiSJD4VV+ckxkEVA7UyQl+nhsCMSZW5DJ9J8-E2sO-A4IQk4QJN8U9P14Jad4VWNvGqz+B2uUmuyHj+B4NjAi48LWnyQljhOYC7cVq79Qsm56Q9bmOA9ZU+Z2JpQSeMLUheTWIeNX3ehl8wwueUT6U9y2XSj7L7j4+6NWFQA */
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

              MERGE: {
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
      sync$: (): Observable<MergeEvent> => {
        console.log("started syncing");

        return fromChannel(broadcastChannel).pipe(
          map((data) => ({ type: "MERGE", data }))
        );
      },
      resync$: (): Observable<ResyncEvent> =>
        from(getFromDb("todos")).pipe(
          map((data) => ({ type: "RESYNC", data }))
        ),
    },
  }
);

const todoService = interpret(todosMachine).start();

export { todoService };

type TodosMachineStateValue = Exclude<
  StateValueFrom<typeof todosMachine>,
  object
>;

export type { TodoUpdateData, TodosMachineStateValue };
