import { UserContext } from "./UserContext";
import RegisterAndLoginForm from "./pages/RegisterAndLoginForm";
import { useContext } from "react";
import Chat from "./pages/Chat";

export default function Routes() {
  const { userName } = useContext(UserContext);

  if (userName) {
    return <Chat />;
  }

  return <RegisterAndLoginForm />;
}
