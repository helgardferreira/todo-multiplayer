import { useSelector } from "@xstate/react";
import { TodoUpdateData, todoService } from "./todos.machine";

const addTodo = (text: string) => {
  todoService.send({ type: "ADD_ITEM", text });
};

const updateTodo = (id: string, data: TodoUpdateData) => {
  todoService.send({ type: "UPDATE_ITEM", id, data });
};

const useTodos = () => {
  const items = useSelector(todoService, ({ context: { doc } }) => {
    return doc?.items ?? [];
  });

  return { items };
};

export { useTodos, addTodo, updateTodo };
