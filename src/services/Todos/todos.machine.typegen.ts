
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "error.platform.todos.active:invocation[0]": { type: "error.platform.todos.active:invocation[0]"; data: unknown };
"error.platform.todos.idle:invocation[0]": { type: "error.platform.todos.idle:invocation[0]"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "loading$": "done.invoke.todos.idle:invocation[0]";
"syncing$": "done.invoke.todos.active:invocation[0]";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "addItem": "ADD_ITEM";
"load": "LOAD";
"merge": "MERGE";
"onFail": "error.platform.todos.active:invocation[0]" | "error.platform.todos.idle:invocation[0]";
"save": "ADD_ITEM" | "UPDATE_ITEM";
"updateItem": "UPDATE_ITEM";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "loading$": "xstate.init";
"syncing$": "ADD_ITEM" | "LOAD" | "MERGE" | "UPDATE_ITEM";
        };
        matchesStates: "active" | "failed" | "idle";
        tags: never;
      }
  