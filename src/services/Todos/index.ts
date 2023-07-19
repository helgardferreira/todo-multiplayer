import { useSelector } from "@xstate/react";
import {
  TodoUpdateData,
  TodosMachineStateValue,
  todoService,
} from "./todos.machine";

const addTodo = (text: string) => todoService.send({ type: "ADD_ITEM", text });

const updateTodo = (id: string, data: TodoUpdateData) =>
  todoService.send({ type: "UPDATE_ITEM", id, data });

const deleteTodo = (id: string) =>
  todoService.send({ type: "DELETE_ITEM", id });

const enableSyncing = () => todoService.send({ type: "ENABLE_SYNC" });

const disableSyncing = () => todoService.send({ type: "DISABLE_SYNC" });

const useTodos = () => {
  const items = useSelector(todoService, ({ context: { doc } }) => {
    return doc?.items ?? [];
  });
  const state = useSelector(todoService, ({ toStrings }) => {
    return toStrings().slice(-1)[0] as TodosMachineStateValue;
  });

  return { items, state };
};

export {
  useTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  enableSyncing,
  disableSyncing,
};
