
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "loading$": "done.invoke.todos.idle:invocation[0]";
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
"save": "ADD_ITEM" | "UPDATE_ITEM";
"updateItem": "UPDATE_ITEM";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          
        };
        eventsCausingServices: {
          "loading$": "xstate.init";
        };
        matchesStates: "active" | "idle";
        tags: never;
      }
  