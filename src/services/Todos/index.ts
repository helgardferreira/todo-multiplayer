import { useSelector } from "@xstate/react";
import { TodoUpdateData, TodosMachineStateValue } from "./todos.machine";
import { useGlobalService } from "../../lib/hooks/useGlobalService";
import { useCallback } from "react";

const useTodos = () => {
  const { todosService } = useGlobalService();

  const items = useSelector(todosService, ({ context: { doc } }) => {
    return doc?.items ?? [];
  });
  const state = useSelector(todosService, ({ toStrings }) => {
    return toStrings().slice(-1)[0] as TodosMachineStateValue;
  });

  const addTodo = useCallback(
    (text: string) => todosService.send({ type: "ADD_ITEM", text }),
    [todosService]
  );
  const updateTodo = useCallback(
    (id: string, data: TodoUpdateData) =>
      todosService.send({ type: "UPDATE_ITEM", id, data }),
    [todosService]
  );
  const deleteTodo = useCallback(
    (id: string) => todosService.send({ type: "DELETE_ITEM", id }),
    [todosService]
  );
  const enableSyncing = useCallback(
    () => todosService.send({ type: "ENABLE_SYNC" }),
    [todosService]
  );
  const disableSyncing = useCallback(
    () => todosService.send({ type: "DISABLE_SYNC" }),
    [todosService]
  );

  return {
    items,
    state,
    addTodo,
    updateTodo,
    deleteTodo,
    enableSyncing,
    disableSyncing,
  };
};

export { useTodos };
