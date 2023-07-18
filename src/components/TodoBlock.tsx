import { useCallback, useEffect, useRef, useState } from "react";
import { Todo } from "../types";
import { updateTodo } from "../services/Todos";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

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

  const handleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleClickOutside = useCallback(() => {
    setIsEditing(false);
  }, []);

  useOnClickOutside(inputRef, handleClickOutside);

  return (
    <div className="todo-block">
      <input type="checkbox" checked={item.done} onChange={handleToggle} />
      {isEditing ? (
        <input
          type="text"
          ref={inputRef}
          onChange={handleInput}
          value={item.text}
        />
      ) : (
        <div onClick={handleClick}>{item.text}</div>
      )}
    </div>
  );
};

export default TodoBlock;
