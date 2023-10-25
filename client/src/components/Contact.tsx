import Avatar from "./Avatar";

type InputContactProps = {
  selectUserId: string | null;
  userId: string;
  username: string;
  setSelectUserId: (userId: string | null) => void;
  online: boolean;
};

export default function Contact({
  userId,
  setSelectUserId,
  selectUserId,
  username,
  online,
}: InputContactProps) {
  return (
    <div
      onClick={() => setSelectUserId(userId)}
      className={
        "border-b border-gray-100 flex  gap-2 cursor-pointer " +
        (userId === selectUserId ? "bg-blue-100" : "")
      }
    >
      {userId === selectUserId && (
        <div className="w-1 bg-blue-500 h-12 rounded-r-md "></div>
      )}
      <div className="flex gap-2 py-2 pl-4  items-center">
        <Avatar online={online} userName={username} userId={userId} />
        <span>{username}</span>
      </div>
    </div>
  );
}
