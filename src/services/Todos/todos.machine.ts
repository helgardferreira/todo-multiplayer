import { createMachine, interpret, assign } from "xstate";

import type { Doc } from "@automerge/automerge";
import * as Automerge from "@automerge/automerge";

import { Todo, TodoList } from "../../types";
import { Observable, from, map } from "rxjs";
import { getFromDb, putInDb } from "../db";
import fromChannel from "../../lib/rxjs/fromChannel";

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
type LoadEvent = { type: "LOAD"; data?: Uint8Array };
type MergeEvent = { type: "MERGE"; data: Uint8Array };
type TodosMachineEvent =
  | AddItemEvent
  | UpdateItemEvent
  | LoadEvent
  | MergeEvent;

const broadcastChannel = new BroadcastChannel("todos");

const todosMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FWwHQEMDGyAlgG5gDEYATpapVgA4A2OyAZrQLZZobb5GkEhAHbFUeFoVTCA2gAYAuvIWJQ9TISLTVIAB6IArAHYDWAGxGAnEbkAmAIwAWWxcsAaEAE9DRgMxYDewMzQKNHA2s5RwBfaI8eTFwCEnIAQQARdIB9AEkAFQBRAFllHXVYTSlhHX0ERyCsOSMADntfILNHZrMnAw9vOts5czlLX2a-dsd2o1j49ET+FLIAVQAFdNTC3MKSxTKNLWqkPURHOXssX18h22tfS2bm9v7EO6MsIfb7FovW3zMcxACT4yVIZCKBQASgBxAqlE7lSraE61ZymIz2Ua+aYGeoGQKvBBDYZhSzk5r1WyBORyZpAkFYQgQRjkKg0OhMFjsShcRnM1lCUTiSTSZQItSHKo1N4uLBWMxPAy+OQhZrKvpeRCtAK02noyy2J6jBkLbAC8gAGQA8hkJSAkUcZcS5QqlSq1Rqicr-JYCUYA2YHHSorE4iBhOg4DoQQcKk7UYgALRmIkpxp6zNZpym3hJARgOPI46gWrjZqfFzBHqGw3K1NahB4yyNDrBbpYxyPXOJC1FhOls62b32FuK2xG65mR602w97CsHCEVkQfvSxMIPwtowhMwhdpmVXPb3XLBjCfNWy+AyTlph6JAA */
    id: "todos",
    tsTypes: {} as import("./todos.machine.typegen").Typegen0,
    predictableActionArguments: true,
    schema: {
      context: {} as TodosMachineContext,
      events: {} as TodosMachineEvent,
    },
    context: {},
    initial: "idle",
    states: {
      active: {
        on: {
          ADD_ITEM: {
            target: "active",
            internal: true,
            actions: ["addItem", "save"],
          },

          UPDATE_ITEM: {
            target: "active",
            internal: true,
            actions: ["updateItem", "save"],
          },

          MERGE: {
            target: "active",
            internal: true,
            actions: "merge",
          },
        },

        invoke: {
          src: "syncing$",
          onError: "failed",
        },
      },

      idle: {
        on: {
          LOAD: {
            target: "active",
            actions: "load",
          },
        },

        invoke: {
          src: "loading$",
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
      load: assign((_, { data }) => {
        if (data) return { doc: Automerge.load<TodoList>(data) };

        return { doc: Automerge.from<TodoList>({ items: [] }) };
      }),
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
      loading$: (): Observable<LoadEvent> =>
        from(getFromDb("todos")).pipe(map((data) => ({ type: "LOAD", data }))),
      syncing$: (): Observable<MergeEvent> =>
        fromChannel(broadcastChannel).pipe(
          map((data) => ({ type: "MERGE", data } as MergeEvent))
        ),
    },
  }
);

const todoService = interpret(todosMachine).start();

export { todoService };

export type { TodoUpdateData };
