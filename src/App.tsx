import { useCallback, useState } from "react";
import "./App.css";
import { addTodo, useTodos } from "./services/Todos";
import TodoBlock from "./components/TodoBlock";

function App() {
  const [text, setText] = useState<string>("");
  const { items } = useTodos();

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    []
  );

  return (
    <>
      <h1>Todo App</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo(text);
          setText("");
        }}
      >
        <input
          type="text"
          value={text}
          onChange={handleInput}
          placeholder="Insert todo text here..."
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.done ? "complete" : ""}>
            <TodoBlock item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
