export default function OnlineIndicator({ online }: { online?: boolean }) {
  if (!online) return null;
  return (
    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
  );
}