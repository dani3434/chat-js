import { useEffect, useState, useContext, useRef } from "react";
import Logo from "../components/Logo";
import { UserContext } from "../UserContext";
import InputMessage from "../components/InputMessage";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "../components/Contact";

interface UploadedFile {
  name: string;
  data: string | ArrayBuffer | null;
}

export default function Chat() {
  const [wsState, setwsState] = useState<WebSocket | null>(null);
  const [onlinePeople, setOnlinePeople] = useState<{
    [userId: string]: string;
  } | null>(null);
  const [selectUserId, setSelectUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    | {
        text: string;
        sender: string;
        recipient: string;
        _id: string;
        file?: UploadedFile | undefined;
      }[]
    | null
  >(null);
  const [offlinePeople, setOfflinePeople] = useState<{
    [userId: string]: OnlinePeople;
  }>({});

  const { setId, id, setLoggedIn, userName } = useContext(UserContext);
  const divUnderMessage = useRef<HTMLDivElement | null>(null);
  const messageBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    connectToWs();
  }, []);

  interface OnlinePeople {
    _id: string;
    username: string;
  }
  useEffect(() => {
    axios.get("/people").then((res) => {
      if (onlinePeople) {
        // Verifique se onlinePeople não é nulo
        const offlinePeopleArr = res.data
          .filter((p: OnlinePeople) => p._id !== id)
          .filter((p: OnlinePeople) => {
            return !Object.keys(onlinePeople).includes(p._id);
          });
        const offlinePeople: { [key: string]: OnlinePeople } = {};
        offlinePeopleArr.forEach((p: OnlinePeople) => {
          offlinePeople[p._id] = p;
        });

        setOfflinePeople(offlinePeople);
      }
    });
  }, [onlinePeople]);

  useEffect(() => {
    if (selectUserId) {
      axios.get("/messages/" + selectUserId).then((res) => {
        setMessages(res.data);
        scrollToBottom();
      });
    }
  }, [selectUserId]);

  function scrollToBottom() {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }

  function logout() {
    if (wsState) {
      wsState.send(JSON.stringify({ disconnect: true }));
      wsState.close();
    }

    axios.post("/logout").then(() => {
      setwsState(null);
      setId(null);
      setLoggedIn(null);
      setOnlinePeople({});
    });
  }

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4000/");
    setwsState(ws);
    ws.addEventListener("message", handleMessage);

    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("tentando se conectar");
        connectToWs();
      }, 1000);
    });
  }

  interface Person {
    userId: string;
    username: string;
  }

  function showOnlinePeople(peopleArray: Person[]) {
    const people: { [userId: string]: string } = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  type MessageData = {
    text: string;
    sender: string;
    recipient: string;
    _id: string;
    file?: UploadedFile | undefined;
  };

  function handleMessage(ev: MessageEvent) {
    const messageData = JSON.parse(ev.data);

    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      setMessages((prev) => [
        ...(prev || []),
        { ...messageData } as MessageData,
      ]);
    }
  }

  const onlinePeopleExcOurUser = { ...onlinePeople };
  delete onlinePeopleExcOurUser[id as string];
  const filteredOnlinePeople = Object.keys(onlinePeopleExcOurUser)
    .filter((key) => onlinePeopleExcOurUser[key] !== undefined)
    .reduce((obj: { [key: string]: string }, key) => {
      obj[key] = onlinePeopleExcOurUser[key];
      return obj;
    }, {});

  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {filteredOnlinePeople &&
            Object.keys(filteredOnlinePeople).map((userId) => (
              <Contact
                key={userId}
                online={true}
                userId={userId}
                setSelectUserId={setSelectUserId}
                selectUserId={selectUserId}
                username={onlinePeopleExcOurUser[userId]}
              />
            ))}
          {/* offline  */}
          {offlinePeople &&
            Object.keys(offlinePeople).map((userId) => (
              <Contact
                key={userId}
                online={false}
                userId={userId}
                setSelectUserId={setSelectUserId}
                selectUserId={selectUserId}
                username={offlinePeople[userId].username}
              />
            ))}
        </div>

        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-500 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
            Bem Vindo(a):
            <span className="text-md uppercase text-blue-500">{userName}</span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-50 bg-blue-500 py-1 px-5 rounded-md"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectUserId && (
            <div className="flex h-full items-center justify-center">
              <div className="">&larr; Selecione uma Conversa</div>
            </div>
          )}
          {!!selectUserId && (
            <div className="relative h-full">
              <div
                className="overflow-y-scroll absolute inset-0"
                ref={messageBoxRef}
              >
                {messagesWithoutDupes.map((m) => (
                  <div
                    key={Math.random().toString(36).substring(7)}
                    className={m.sender === id ? "text-right" : "text-left"}
                  >
                    <div
                      className={
                        "text-left inline-block p-2 my-2 rounded-md text-sm " +
                        (m.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {m.text}
                      {m.file && (
                        <div>
                          {typeof m.file === "string" ? (
                            <a
                              href={
                                axios.defaults.baseURL + "/uploads/" + m.file
                              }
                            >
                              {m.file as string}
                            </a>
                          ) : (
                            <a
                              href={
                                axios.defaults.baseURL + "/uploads/" + m.file
                              }
                            >
                              {m.file.name}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessage}></div>
              </div>
            </div>
          )}
        </div>

        <InputMessage
          webSocket={wsState}
          selectUserId={selectUserId}
          sender={id as string}
          onMessageSend={(message) =>
            setMessages((prevMessages) => [...(prevMessages ?? []), message])
          }
          messageBoxRef={divUnderMessage}
          setMessages={setMessages}
        />
      </div>
    </div>
  );
}
