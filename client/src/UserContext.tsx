import axios from "axios";
import {
  createContext,
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";

interface Register {
  userName: string | null;
  id: string | null;
  setLoggedIn: Dispatch<SetStateAction<string | null>>;
  setId: Dispatch<SetStateAction<string | null>>;
}

export const UserContext = createContext<Register>({} as Register);

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setLoggedIn] = useState<string | null>("");
  const [id, setId] = useState<string | null>("");

  useEffect(() => {
    axios.get("/profile").then((response) => {
      setId(response.data.userId);
      setLoggedIn(response.data.username);
    });
  }, []);

  return (
    <UserContext.Provider value={{ userName, setLoggedIn, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
