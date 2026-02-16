import { useCanvasStore } from "@/canvas/canvas.store";
import { useZoomStore } from "@/canvas/tools/zoom.tool";
import { useSyncStore } from "@/sync/sync.store";

export const StatusBar = () => {
    const cursor = useCanvasStore((state) => state.cursor);
    const zoom = useZoomStore((state) => state.zoom);
    const { isConnected, isReconnecting, roomUsers } = useSyncStore();

    const connectionDotColor = isReconnecting ? "bg-yellow-500" : isConnected ? "bg-green-500" : "bg-gray-500";
    const connectionTitle = isReconnecting ? "Reconnecting..." : isConnected ? "Connected" : "Offline";

    return (
        <div className="flex justify-between items-center py-1 px-4 text-xs gap-4">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionDotColor}`} title={connectionTitle} />
                <div className="flex -space-x-2">
                    {roomUsers.map(user => (
                        <div
                            key={user.uid}
                            className="w-5 h-5 rounded-full border-2 border-default-2"
                            style={{ backgroundColor: user.color }}
                            title={user.name}
                        />
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4">
                {cursor && (
                    <div>
                        {Math.floor(cursor.x)}:{Math.floor(cursor.y)}
                    </div>
                )}
                <div className="w-24 text-right">{zoom}%</div>
            </div>
        </div>
    );
};
