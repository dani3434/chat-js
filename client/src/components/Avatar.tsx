export default function Avatar({
  userName,
  userId,
  online,
}: {
  userName: string;
  userId: string;
  online: boolean;
}) {
  const colors = [
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-teal-200",
  ];
  const userIdBase10 = parseInt(userId, 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];

  return (
    <div className={"w-9 h-9 relative rounded-full flex items-center " + color}>
      <div className="text-center w-full">{userName ? userName[0] : ""}</div>
      {online && (
        <div className="absolute h-2 w-2 bg-green-500 bottom-0 right-0 rounded-full border border-black"></div>
      )}
      {!online && (
        <div className="absolute h-2 w-2 bg-gray-500 bottom-0 right-0 rounded-full border border-black"></div>
      )}
    </div>
  );
}
