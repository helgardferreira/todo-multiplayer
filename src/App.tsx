import { useCallback, useMemo, useState } from "react";
import "./App.css";
import { useTodos } from "./services/Todos";
import TodoBlock from "./components/TodoBlock";

function App() {
  const [text, setText] = useState<string>("");
  const { items, state, addTodo, disableSyncing, enableSyncing } = useTodos();

  const isSyncing = useMemo(() => state === "active.syncing", [state]);

  const toggleSyncing = useCallback(() => {
    if (isSyncing) disableSyncing();
    else enableSyncing();
  }, [disableSyncing, enableSyncing, isSyncing]);

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
        <button onClick={toggleSyncing}>
          {isSyncing ? "Disable" : "Enable"} Syncing
        </button>
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
