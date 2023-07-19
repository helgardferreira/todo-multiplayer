
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "error.platform.todos.active.loading:invocation[0]": { type: "error.platform.todos.active.loading:invocation[0]"; data: unknown };
"error.platform.todos.active.syncing:invocation[0]": { type: "error.platform.todos.active.syncing:invocation[0]"; data: unknown };
"error.platform.todos.loading:invocation[0]": { type: "error.platform.todos.loading:invocation[0]"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "load$": "done.invoke.todos.loading:invocation[0]";
"resync$": "done.invoke.todos.active.loading:invocation[0]";
"sync$": "done.invoke.todos.active.syncing:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addItem": "ADD_ITEM";
"attemptSave": "ADD_ITEM" | "DELETE_ITEM" | "UPDATE_ITEM";
"deleteItem": "DELETE_ITEM";
"load": "LOAD";
"merge": "RESYNC" | "SYNC";
"onFail": "error.platform.todos.active.loading:invocation[0]" | "error.platform.todos.active.syncing:invocation[0]" | "error.platform.todos.loading:invocation[0]";
"save": "RESYNC" | "SAVE";
"updateItem": "UPDATE_ITEM";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "load$": "xstate.init";
"resync$": "ENABLE_SYNC";
"sync$": "LOAD" | "RESYNC" | "SAVE" | "SYNC";
        };
        matchesStates: "active" | "active.idle" | "active.loading" | "active.syncing" | "failed" | "loading" | { "active"?: "idle" | "loading" | "syncing"; };
        tags: never;
      }
  