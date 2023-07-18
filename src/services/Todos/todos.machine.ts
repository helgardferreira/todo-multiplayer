import { createMachine, interpret, assign } from "xstate";

import type { Doc } from "@automerge/automerge";
import * as Automerge from "@automerge/automerge";

import { Todo, TodoList } from "../../types";
import { Observable, from, map } from "rxjs";
import { getFromDb, putInDb } from "../db";

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
type TodosMachineEvent = AddItemEvent | UpdateItemEvent | LoadEvent;

const todosMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FUDoCGBjZAlgG5gDEAggCKUD6AkgCoCiAsgNoAMAuoqAA6pYBQqgB2vEAA9EAZgCcANkxyA7ACYFAVgVrNAGhABPRGo4AWZRx2aAvjYNoMOfMTIBVAAqVyzes3bcEgJCIuJIUrIAHDKYahraugbGCJEAjJi29iCOWAQQADZkADIA8lScPOHBwgRiEtIIcUoqipEq+kayHHKY0ZpyMu12Dui5BWRgAE6TqJOYfPnYyABmswC2mDmYeYUIBKJEqLhLtaIVFUGCNXXhDU2YLQptHckaapgyMv2DmVmi6HAJDlLiFTvVEABaBRJSEKYbZUbOQgkEHXMKgBpmVIWFQqGRmH4whCfGIyVK6eFbHZgVGhcEIMxqIlqOSaDLWOx2IA */
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
          onError: "active",
        },
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
      },
    },
    services: {
      loading$: (): Observable<LoadEvent> =>
        from(getFromDb("todos")).pipe(map((data) => ({ type: "LOAD", data }))),
    },
  }
);

const todoService = interpret(todosMachine).start();

export { todoService };

export type { TodoUpdateData };
