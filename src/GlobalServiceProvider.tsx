import { todosMachine } from "./services/Todos/todos.machine";
import { useInterpret } from "@xstate/react";
import { GlobalServiceContext } from "./lib/hooks/useGlobalService";

const GlobalServiceProvider = ({ children }: React.PropsWithChildren) => {
  const todosService = useInterpret(todosMachine);

  return (
    <GlobalServiceContext.Provider value={{ todosService }}>
      {children}
    </GlobalServiceContext.Provider>
  );
};

export default GlobalServiceProvider;
