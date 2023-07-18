type Todo = {
  text: string;
  done: boolean;
  id: string;
};

type TodoList = {
  items: Todo[];
};

export type { Todo, TodoList };
