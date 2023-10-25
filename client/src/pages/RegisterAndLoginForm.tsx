import axios from "axios";
import { useContext, useState } from "react";
import { UserContext } from "../UserContext";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("Registrar");
  const { setId, setLoggedIn } = useContext(UserContext);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = isLoginOrRegister === "Registrar" ? "/register" : "/login";
    const { data } = await axios.post(url, { username, password });

    setLoggedIn(username as string);
    setId(data.id);
  }

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="nome do usuário"
          className="block w-full rounded-sm p-2 mb-2 border"
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
        />
        <input
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          type="password"
          placeholder="senha"
          className="block w-full rounded-sm p-2 mb-2 border"
        />
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
          {isLoginOrRegister === "Registrar" ? "Registrar" : "Logar"}
        </button>
        <div className="text-center mt-2">
          {isLoginOrRegister === "Registrar" && (
            <div>
              Já tem conta?{" "}
              <button onClick={() => setIsLoginOrRegister("Login")}>
                Login aqui!
              </button>
            </div>
          )}

          {isLoginOrRegister === "Login" && (
            <div>
              Não está Registrado?{" "}
              <button onClick={() => setIsLoginOrRegister("Registrar")}>
                Registre aqui!
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
