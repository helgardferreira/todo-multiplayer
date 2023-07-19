import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "react-feather";

import { Todo } from "../types";
import { deleteTodo, updateTodo } from "../services/Todos";
import { useOnClickOutside } from "../lib/hooks/useOnClickOutside";

type TodoProps = {
  item: Todo;
};

const TodoBlock = ({ item }: TodoProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateTodo(item.id, { text: e.target.value ?? "" }),
    [item.id]
  );

  const handleToggle = useCallback(() => {
    updateTodo(item.id, { done: !item.done });
  }, [item.done, item.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    // If user presses enter key while editing, stop editing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setIsEditing(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleClickOutside = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleDelete = useCallback(() => {
    deleteTodo(item.id);
  }, [item.id]);

  useOnClickOutside(inputRef, handleClickOutside);

  return (
    <div className="todo-block">
      <button onClick={handleDelete}>
        <Trash2 width={16} height={16} />
      </button>
      <input type="checkbox" checked={item.done} onChange={handleToggle} />
      {isEditing ? (
        <input
          type="text"
          ref={inputRef}
          onChange={handleInput}
          value={item.text}
        />
      ) : (
        <div onClick={startEditing}>{item.text}</div>
      )}
    </div>
  );
};

export default TodoBlock;
