import { createContext, useContext } from "react";
import { TodosMachineService } from "../../services/Todos/todos.machine";

type Services = {
  todosService: TodosMachineService;
};

export const GlobalServiceContext = createContext<Services | null>(null);

export const useGlobalService = () => {
  const context = useContext(GlobalServiceContext);

  if (context === null) {
    throw new Error("useGlobalService must be used within a GlobalService");
  }

  return context;
};
